import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Field, SectionTitle } from '../../components/ui';
import { api } from '../../api';
import { clearDraft } from '../../draftStore';
import { calcularResultado, validarRespuestas } from '../../rules';
import { colors, spacing } from '../../theme';
import { NIVELES, RESULTADOS } from '../../utils';

export default function ResumenScreen({ route, navigation }) {
  const { inspeccion, catalogo, respuestas } = route.params;
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState(false);

  const calculo = useMemo(() => calcularResultado(respuestas, catalogo), [respuestas, catalogo]);
  const errores = useMemo(() => validarRespuestas(respuestas, catalogo), [respuestas, catalogo]);
  const fallados = useMemo(() => catalogo.filter((i) => respuestas[i.id]?.estado === 'no_cumple'), [catalogo, respuestas]);
  const resultado = RESULTADOS[calculo.resultado];
  const completo = errores.length === 0;

  const finalizar = async () => {
    if (!completo || enviando) return;
    setEnviando(true);
    try {
      const detalles = catalogo.map((item) => {
        const r = respuestas[item.id];
        const d = { item_id: item.id, estado: r.estado };
        if (r.estado === 'no_cumple') {
          d.descripcion_falla = r.descripcion_falla.trim();
          d.fotos = (r.fotos || []).map((f) => ({ mime: f.mime, base64: f.base64 }));
        }
        if (r.estado === 'no_aplica') d.motivo_no_aplica = r.motivo_no_aplica.trim();
        return d;
      });

      const r = await api.completar(inspeccion.id, { observaciones: observaciones.trim() || undefined, detalles });
      clearDraft(inspeccion.id);

      Alert.alert('Inspección finalizada', `Nota ${r.nota}/100 · ${RESULTADOS[r.resultado].label}`);
      // Deja la lista como pantalla de retorno y muestra el detalle de lo recién enviado
      navigation.reset({
        index: 1,
        routes: [{ name: 'HomeInspector' }, { name: 'Detalle', params: { id: inspeccion.id } }],
      });
    } catch (e) {
      setEnviando(false);
      const extra = e.data && Array.isArray(e.data.detalles) ? '\n\n' + e.data.detalles.slice(0, 4).join('\n') : '';
      Alert.alert('No se pudo finalizar', e.message + extra);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>NOTA CALCULADA</Text>
          <Text style={styles.heroNota}>
            {calculo.nota}
            <Text style={styles.heroMax}> / 100</Text>
          </Text>
          <Badge label={resultado.label} fg={resultado.fg} bg={resultado.bg} />
          <Text style={styles.heroNote}>Estimación en el teléfono: la nota oficial la calcula el servidor al finalizar.</Text>
        </View>

        <View style={styles.stats}>
          <Stat n={calculo.cumple} label="Cumplen" color={colors.success} />
          <Stat n={calculo.fallas} label="Fallas" color={colors.danger} />
          <Stat n={calculo.noAplica} label="No aplican" color={colors.neutral} />
        </View>

        {!completo ? (
          <Card style={styles.pending}>
            <View style={styles.pendingHead}>
              <Ionicons name="warning-outline" size={18} color={colors.warn} />
              <Text style={styles.pendingTitle}>Faltan {errores.length} punto{errores.length === 1 ? '' : 's'} por completar</Text>
            </View>
            {errores.slice(0, 6).map((e) => (
              <Text key={e.mensaje} style={styles.pendingItem}>
                • {e.mensaje}
              </Text>
            ))}
            {errores.length > 6 ? <Text style={styles.pendingItem}>• y {errores.length - 6} más…</Text> : null}
          </Card>
        ) : null}

        <SectionTitle>ÍTEMS CON FALLAS ({fallados.length})</SectionTitle>
        {fallados.length === 0 ? <Text style={styles.none}>Sin fallas registradas.</Text> : null}
        {fallados.map((item) => {
          const nivel = NIVELES[item.nivel];
          const r = respuestas[item.id];
          return (
            <Card key={item.id} style={{ borderLeftWidth: 4, borderLeftColor: nivel.fg }}>
              <View style={styles.failHead}>
                <Text style={styles.failTitle}>
                  {item.id} · {item.seccion}
                </Text>
                <Badge label={nivel.nombre} fg={nivel.fg} bg={nivel.bg} />
              </View>
              <Text style={styles.failItem}>{item.titulo}</Text>
              <Text style={styles.failDesc}>{r.descripcion_falla || 'Sin descripción'}</Text>
              <Text style={styles.failMeta}>
                {(r.fotos || []).length} foto{(r.fotos || []).length === 1 ? '' : 's'} adjunta{(r.fotos || []).length === 1 ? '' : 's'}
              </Text>
            </Card>
          );
        })}

        <Field
          label="Observaciones generales (opcional)"
          value={observaciones}
          onChangeText={setObservaciones}
          placeholder="Ej: corregir luces antes de la próxima ruta"
          multiline
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Finalizar inspección" icon="checkmark-done-outline" onPress={finalizar} disabled={!completo} loading={enviando} />
        <Button title="Revisar checklist" variant="outline" onPress={() => navigation.goBack()} disabled={enviando} style={{ marginTop: spacing.sm }} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Stat({ n, label, color }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, { color }]}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: { backgroundColor: colors.ink, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: spacing.md },
  heroLabel: { fontSize: 11.5, color: '#9AA7B5', fontWeight: '700', letterSpacing: 0.4 },
  heroNota: { fontSize: 46, fontWeight: '800', color: '#fff', marginVertical: 4 },
  heroMax: { fontSize: 20, color: '#9AA7B5', fontWeight: '600' },
  heroNote: { fontSize: 11, color: '#7D8A97', textAlign: 'center', marginTop: 12 },
  stats: { flexDirection: 'row', marginBottom: spacing.md },
  stat: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginRight: 8 },
  statN: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  pending: { backgroundColor: colors.warnBg, borderColor: '#F0D2A6' },
  pendingHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  pendingTitle: { marginLeft: 8, fontSize: 13.5, fontWeight: '700', color: colors.warn },
  pendingItem: { fontSize: 12.5, color: colors.warn, marginTop: 3 },
  none: { fontSize: 13, color: colors.muted, marginBottom: spacing.md },
  failHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  failTitle: { fontSize: 12, color: colors.muted, flex: 1, marginRight: 8 },
  failItem: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6 },
  failDesc: { fontSize: 13, color: colors.textSoft, marginTop: 4 },
  failMeta: { fontSize: 11.5, color: colors.muted, marginTop: 6 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg },
});
