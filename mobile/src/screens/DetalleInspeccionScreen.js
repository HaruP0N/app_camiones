import React, { useCallback, useState } from 'react';
import { Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorState, Loading, Plate, SectionTitle } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { api, fotoUri } from '../api';
import { useFocusFetch } from '../hooks';
import { colors, spacing } from '../theme';
import { CARROCERIAS, ESTADOS, NIVELES, RESULTADOS, formatFechaHora } from '../utils';

const ESTADO_ITEM = {
  cumple: { label: 'Cumple', icon: 'checkmark-circle', color: colors.success },
  no_cumple: { label: 'No cumple', icon: 'close-circle', color: colors.danger },
  no_aplica: { label: 'No aplica', icon: 'remove-circle-outline', color: colors.neutral },
};

export default function DetalleInspeccionScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [foto, setFoto] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  const fetcher = useCallback(() => api.getInspeccion(id), [id]);
  const { data, error, loading, refreshing, refresh, reload } = useFocusFetch(fetcher);

  const cancelar = () => {
    Alert.alert('Cancelar inspección', '¿Seguro que quieres cancelar esta inspección programada? Esta acción no se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setCancelando(true);
          try {
            await api.cancelar(id);
            navigation.goBack();
          } catch (e) {
            setCancelando(false);
            Alert.alert('No se pudo cancelar', e.message);
          }
        },
      },
    ]);
  };

  if (loading) return <Loading text="Cargando detalle…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { inspeccion: i, detalles } = data;
  const completada = i.estado === 'COMPLETADA';
  const estado = ESTADOS[i.estado];
  const resultado = i.resultado ? RESULTADOS[i.resultado] : null;
  const fallas = detalles.filter((d) => d.estado === 'no_cumple').length;
  const puedeCancelar = user.rol === 'supervisor' && i.estado === 'PROGRAMADA';

  // Agrupa los ítems por nivel de criticidad
  const porNivel = [1, 2, 3, 4]
    .map((n) => ({ nivel: n, items: detalles.filter((d) => d.nivel === n) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}
      >
        <Card>
          <View style={styles.row}>
            <Plate patente={i.patente} />
            <Badge label={estado.label} fg={estado.fg} bg={estado.bg} />
          </View>
          <Text style={styles.title}>
            {i.marca} {i.modelo} {i.anio || ''}
          </Text>
          <Text style={styles.sub}>
            {CARROCERIAS[i.carroceria] || i.carroceria}
            {i.empresa ? ` · ${i.empresa}` : ''}
          </Text>
          <View style={styles.sep} />
          <Info icon="person-circle-outline" text={`Inspector: ${i.inspector_nombre}`} />
          <Info icon="calendar-outline" text={`Programada: ${formatFechaHora(i.fecha_programada)}`} />
          {completada ? <Info icon="checkmark-done-outline" text={`Completada: ${formatFechaHora(i.fecha_completacion)}`} /> : null}
          {i.lugar ? <Info icon="document-text-outline" text={`Lugar: ${i.lugar}`} /> : null}
        </Card>

        {completada && resultado ? (
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>NOTA FINAL</Text>
            <Text style={styles.heroNota}>
              {i.nota_final}
              <Text style={styles.heroMax}> / 100</Text>
            </Text>
            <Badge label={resultado.label} fg={resultado.fg} bg={resultado.bg} />
            <Text style={styles.heroSub}>
              {fallas} falla{fallas === 1 ? '' : 's'} · {detalles.length} ítems evaluados
            </Text>
            {i.observaciones ? <Text style={styles.obs}>“{i.observaciones}”</Text> : null}
          </View>
        ) : (
          <Card style={styles.pendiente}>
            <Ionicons name="time-outline" size={20} color={colors.info} />
            <Text style={styles.pendienteText}>
              {i.estado === 'EN_PROGRESO' ? 'El inspector está realizando esta inspección.' : 'Inspección pendiente: aún no se realiza.'}
            </Text>
          </Card>
        )}

        {porNivel.map((g) => {
          const nivel = NIVELES[g.nivel];
          return (
            <View key={g.nivel}>
              <SectionTitle style={{ marginTop: spacing.lg }}>
                NIVEL {g.nivel} · {nivel.nombre}
              </SectionTitle>
              {g.items.map((d) => {
                const e = ESTADO_ITEM[d.estado];
                return (
                  <Card key={d.item_id} style={d.estado === 'no_cumple' ? { borderLeftWidth: 4, borderLeftColor: colors.danger } : undefined}>
                    <View style={styles.itemRow}>
                      <Ionicons name={e.icon} size={22} color={e.color} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.itemMeta}>
                          {d.item_id} · {d.seccion}
                        </Text>
                        <Text style={styles.itemTitle}>{d.titulo}</Text>
                      </View>
                      <Text style={[styles.itemEstado, { color: e.color }]}>{e.label}</Text>
                    </View>

                    {d.estado === 'no_cumple' ? <Text style={styles.detalleTxt}>{d.descripcion_falla}</Text> : null}
                    {d.estado === 'no_aplica' && d.motivo_no_aplica ? <Text style={styles.detalleTxt}>Motivo: {d.motivo_no_aplica}</Text> : null}

                    {d.fotos && d.fotos.length > 0 ? (
                      <View style={styles.thumbs}>
                        {d.fotos.map((fid) => (
                          <Pressable key={fid} onPress={() => setFoto(fid)}>
                            <Image source={{ uri: fotoUri(fid) }} style={styles.thumb} />
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          );
        })}

        {puedeCancelar ? (
          <Button title="Cancelar inspección" variant="danger" icon="trash-outline" onPress={cancelar} loading={cancelando} style={{ marginTop: spacing.lg }} />
        ) : null}
      </ScrollView>

      <Modal visible={foto !== null} transparent animationType="fade" onRequestClose={() => setFoto(null)}>
        <Pressable style={styles.modal} onPress={() => setFoto(null)}>
          {foto !== null ? <Image source={{ uri: fotoUri(foto) }} style={styles.full} resizeMode="contain" /> : null}
          <Text style={styles.modalHint}>Toca para cerrar</Text>
        </Pressable>
      </Modal>
    </>
  );
}

function Info({ icon, text }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={16} color={colors.muted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  info: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  infoText: { fontSize: 13, color: colors.textSoft, marginLeft: 8, flex: 1 },

  hero: { backgroundColor: colors.ink, borderRadius: 16, padding: 22, alignItems: 'center' },
  heroLabel: { fontSize: 11.5, color: '#9AA7B5', fontWeight: '700', letterSpacing: 0.4 },
  heroNota: { fontSize: 46, fontWeight: '800', color: '#fff', marginVertical: 4 },
  heroMax: { fontSize: 20, color: '#9AA7B5', fontWeight: '600' },
  heroSub: { fontSize: 12.5, color: '#9AA7B5', marginTop: 12 },
  obs: { fontSize: 13, color: '#C9D2DA', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  pendiente: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.infoBg, borderColor: '#C8D8F2' },
  pendienteText: { marginLeft: 10, color: colors.info, fontWeight: '600', fontSize: 13.5, flex: 1 },

  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemMeta: { fontSize: 11.5, color: colors.muted },
  itemTitle: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 1 },
  itemEstado: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  detalleTxt: { fontSize: 13, color: colors.textSoft, marginTop: 10 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  thumb: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.neutralBg, marginRight: 8, marginBottom: 4 },

  modal: { flex: 1, backgroundColor: 'rgba(10,14,18,0.94)', alignItems: 'center', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  modalHint: { color: '#9AA7B5', fontSize: 12.5, marginTop: 12 },
});
