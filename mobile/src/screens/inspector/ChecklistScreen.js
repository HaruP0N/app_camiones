import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, ErrorState, Loading } from '../../components/ui';
import { api } from '../../api';
import { getDraft, setDraft } from '../../draftStore';
import { MAX_FOTOS_POR_ITEM } from '../../rules';
import { colors, radius, spacing } from '../../theme';
import { CARROCERIAS, NIVELES, formatPatente } from '../../utils';

const OPCIONES = [
  { value: 'cumple', label: 'Cumple', color: colors.success },
  { value: 'no_cumple', label: 'No cumple', color: colors.danger },
  { value: 'no_aplica', label: 'No aplica', color: colors.neutral },
];

// ------------------------------------------------------------------ Fila de un ítem
const ItemRow = memo(function ItemRow({ item, resp, onChange, onAddPhoto, onRemovePhoto }) {
  const estado = resp?.estado;
  const fotos = resp?.fotos || [];
  const nivel = NIVELES[item.nivel];

  return (
    <View style={[styles.item, estado === 'no_cumple' && styles.itemFalla]}>
      <View style={styles.itemHead}>
        <Text style={styles.itemMeta}>
          {item.id} · {item.seccion}
        </Text>
        <Badge label={nivel.nombre} fg={nivel.fg} bg={nivel.bg} />
      </View>
      <Text style={styles.itemTitle}>{item.titulo}</Text>

      <View style={styles.segment}>
        {OPCIONES.map((o) => {
          const selected = estado === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(item.id, { estado: o.value })}
              style={[styles.opt, selected && { backgroundColor: o.color, borderColor: o.color }]}
            >
              <Text style={[styles.optText, selected && { color: '#fff' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {estado === 'no_cumple' ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={styles.label}>Descripción de la falla</Text>
          <TextInput
            value={resp?.descripcion_falla || ''}
            onChangeText={(t) => onChange(item.id, { descripcion_falla: t })}
            placeholder="Describe qué se observó (mín. 10 caracteres)"
            placeholderTextColor={colors.muted}
            multiline
            style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
          />

          <Text style={[styles.label, { marginTop: spacing.md }]}>
            Evidencia fotográfica ({fotos.length}/{MAX_FOTOS_POR_ITEM})
          </Text>
          {fotos.length > 0 ? (
            <View style={styles.thumbs}>
              {fotos.map((f, idx) => (
                <View key={idx} style={styles.thumbWrap}>
                  <Image source={{ uri: f.uri }} style={styles.thumb} />
                  <Pressable onPress={() => onRemovePhoto(item.id, idx)} style={styles.thumbX} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row' }}>
            <Button
              title="Cámara"
              icon="camera-outline"
              variant="outline"
              disabled={fotos.length >= MAX_FOTOS_POR_ITEM}
              onPress={() => onAddPhoto(item.id, 'camera')}
              style={styles.photoBtn}
            />
            <Button
              title="Galería"
              icon="images-outline"
              variant="outline"
              disabled={fotos.length >= MAX_FOTOS_POR_ITEM}
              onPress={() => onAddPhoto(item.id, 'gallery')}
              style={[styles.photoBtn, { marginLeft: spacing.sm }]}
            />
          </View>
        </View>
      ) : null}

      {estado === 'no_aplica' ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={styles.label}>Motivo</Text>
          <TextInput
            value={resp?.motivo_no_aplica || ''}
            onChangeText={(t) => onChange(item.id, { motivo_no_aplica: t })}
            placeholder="¿Por qué no aplica a este vehículo?"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
      ) : null}
    </View>
  );
});

// ------------------------------------------------------------------ Pantalla
export default function ChecklistScreen({ route, navigation }) {
  const { id } = route.params;
  const [inspeccion, setInspeccion] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [respuestas, setRespuestas] = useState(() => getDraft(id) || {});
  const [nivel, setNivel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [insp, cat] = await Promise.all([api.getInspeccion(id), api.getCatalogo()]);
      if (insp.inspeccion.estado === 'COMPLETADA') {
        navigation.replace('Detalle', { id });
        return;
      }
      setInspeccion(insp.inspeccion);
      setCatalogo(cat.items);
      navigation.setOptions({ title: formatPatente(insp.inspeccion.patente) });
      if (insp.inspeccion.estado === 'PROGRAMADA') api.iniciar(id).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Guarda el borrador para no perder lo avanzado si se vuelve atrás
  useEffect(() => {
    setDraft(id, respuestas);
  }, [id, respuestas]);

  const onChange = useCallback((itemId, patch) => {
    setRespuestas((prev) => ({ ...prev, [itemId]: { fotos: [], ...(prev[itemId] || {}), ...patch } }));
  }, []);

  const onRemovePhoto = useCallback((itemId, idx) => {
    setRespuestas((prev) => {
      const cur = prev[itemId];
      if (!cur) return prev;
      return { ...prev, [itemId]: { ...cur, fotos: (cur.fotos || []).filter((_, i) => i !== idx) } };
    });
  }, []);

  const onAddPhoto = useCallback(async (itemId, source) => {
    try {
      let result;
      const opciones = { mediaTypes: ['images'], quality: 0.4, base64: true };
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permiso necesario', 'Activa el permiso de cámara en los ajustes del teléfono para tomar fotos de evidencia.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(opciones);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(opciones);
      }
      if (result.canceled || !result.assets || !result.assets.length) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('No se pudo leer la foto', 'Intenta nuevamente.');
        return;
      }
      setRespuestas((prev) => {
        const cur = prev[itemId] || { fotos: [] };
        const fotos = cur.fotos || [];
        if (fotos.length >= MAX_FOTOS_POR_ITEM) return prev;
        return { ...prev, [itemId]: { ...cur, fotos: [...fotos, { uri: asset.uri, base64: asset.base64, mime: 'image/jpeg' }] } };
      });
    } catch (e) {
      Alert.alert('No se pudo abrir la cámara', e.message);
    }
  }, []);

  const itemsNivel = useMemo(() => catalogo.filter((i) => i.nivel === nivel), [catalogo, nivel]);

  const progreso = useMemo(() => {
    const porNivel = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] };
    let total = 0;
    let hechos = 0;
    for (const i of catalogo) {
      porNivel[i.nivel][1] += 1;
      total += 1;
      if (respuestas[i.id]?.estado) {
        porNivel[i.nivel][0] += 1;
        hechos += 1;
      }
    }
    return { porNivel, total, hechos };
  }, [catalogo, respuestas]);

  const marcarTodoCumple = () => {
    setRespuestas((prev) => {
      const next = { ...prev };
      for (const i of itemsNivel) {
        if (!next[i.id]?.estado) next[i.id] = { fotos: [], ...(next[i.id] || {}), estado: 'cumple' };
      }
      return next;
    });
  };

  if (loading) return <Loading text="Preparando checklist…" />;
  if (error || !inspeccion) return <ErrorState message={error || 'No se encontró la inspección'} onRetry={cargar} />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {inspeccion.marca} {inspeccion.modelo} · {CARROCERIAS[inspeccion.carroceria] || inspeccion.carroceria}
          </Text>
          <Text style={styles.topCount}>
            {progreso.hechos}/{progreso.total}
          </Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}%` }]} />
        </View>

        <View style={styles.tabs}>
          {[1, 2, 3, 4].map((n) => {
            const activo = nivel === n;
            const [ok, tot] = progreso.porNivel[n];
            return (
              <Pressable key={n} onPress={() => setNivel(n)} style={[styles.tab, activo && styles.tabActive]}>
                <Text style={[styles.tabN, activo && { color: '#fff' }]}>N{n}</Text>
                <Text style={[styles.tabName, activo && { color: '#C9D2DA' }]}>{NIVELES[n].nombre}</Text>
                <Text style={[styles.tabCount, activo && { color: colors.amber }]}>
                  {ok}/{tot}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={itemsNivel}
        extraData={respuestas}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Pressable onPress={marcarTodoCumple} style={styles.quick}>
            <Ionicons name="checkmark-done-outline" size={16} color={colors.textSoft} />
            <Text style={styles.quickText}>Marcar pendientes de este nivel como “Cumple”</Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <ItemRow item={item} resp={respuestas[item.id]} onChange={onChange} onAddPhoto={onAddPhoto} onRemovePhoto={onRemovePhoto} />
        )}
      />

      <View style={styles.footer}>
        <Button
          title="Ver resumen y finalizar"
          icon="document-text-outline"
          onPress={() => navigation.navigate('Resumen', { inspeccion, catalogo, respuestas })}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  top: { backgroundColor: colors.ink, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topTitle: { flex: 1, color: '#C9D2DA', fontSize: 13, marginRight: 10 },
  topCount: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bar: { height: 5, backgroundColor: colors.inkSoft, borderRadius: 3, marginTop: 8, marginBottom: spacing.md, overflow: 'hidden' },
  barFill: { height: 5, backgroundColor: colors.amber, borderRadius: 3 },
  tabs: { flexDirection: 'row', backgroundColor: colors.inkSoft, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 9 },
  tabActive: { backgroundColor: '#3B4757' },
  tabN: { fontSize: 14, fontWeight: '800', color: '#9AA7B5' },
  tabName: { fontSize: 9.5, fontWeight: '700', color: '#7D8A97', marginTop: 1 },
  tabCount: { fontSize: 11, fontWeight: '700', color: '#9AA7B5', marginTop: 2 },

  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  quick: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 6, marginBottom: spacing.md },
  quickText: { fontSize: 12.5, color: colors.textSoft, marginLeft: 6, fontWeight: '600' },

  item: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: spacing.md },
  itemFalla: { borderColor: colors.danger, borderLeftWidth: 4 },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemMeta: { fontSize: 11.5, color: colors.muted },
  itemTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text, marginBottom: 12 },

  segment: { flexDirection: 'row' },
  opt: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: colors.borderStrong, marginRight: 6 },
  optText: { fontSize: 12.5, fontWeight: '700', color: colors.textSoft },

  label: { fontSize: 12, fontWeight: '700', color: colors.textSoft, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, backgroundColor: '#fff' },

  thumbs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  thumbWrap: { marginRight: 8, marginBottom: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.neutralBg },
  thumbX: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 11 },
  photoBtn: { flex: 1, paddingVertical: 11 },

  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
});
