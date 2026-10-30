import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chip, ErrorState, Field, Loading, Plate, SectionTitle } from '../../components/ui';
import { api } from '../../api';
import { useFocusFetch } from '../../hooks';
import { colors, spacing } from '../../theme';
import { CARROCERIAS, diaCorto } from '../../utils';

const HORAS = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

const armarFecha = (dia, hora) => {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date(dia);
  d.setHours(h, m, 0, 0);
  return d;
};

export default function AgendarScreen({ navigation }) {
  const fetcher = useCallback(async () => {
    const [c, i] = await Promise.all([api.getCamiones(), api.getInspectores()]);
    return { camiones: c.camiones, inspectores: i.inspectores };
  }, []);
  const { data, error, loading, reload } = useFocusFetch(fetcher);

  const [camionId, setCamionId] = useState(null);
  const [inspectorId, setInspectorId] = useState(null);
  const [diaIdx, setDiaIdx] = useState(0);
  const [hora, setHora] = useState(null);
  const [lugar, setLugar] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Próximos 7 días
  const dias = useMemo(
    () =>
      Array.from({ length: 7 }, (_, n) => {
        const d = new Date();
        d.setDate(d.getDate() + n);
        d.setHours(0, 0, 0, 0);
        return { date: d, label: n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `${diaCorto(d)} ${d.getDate()}` };
      }),
    []
  );

  const esPasada = (h) => armarFecha(dias[diaIdx].date, h).getTime() <= Date.now();

  const agendar = async () => {
    if (!camionId) return Alert.alert('Falta información', 'Selecciona un camión.');
    if (!inspectorId) return Alert.alert('Falta información', 'Selecciona un inspector.');
    if (!hora) return Alert.alert('Falta información', 'Selecciona la hora de la inspección.');

    setEnviando(true);
    try {
      await api.agendar({
        camion_id: camionId,
        inspector_id: inspectorId,
        fecha_programada: armarFecha(dias[diaIdx].date, hora).toISOString(),
        lugar: lugar.trim() || undefined,
      });
      setCamionId(null);
      setInspectorId(null);
      setHora(null);
      setLugar('');
      reload();
      Alert.alert('Inspección agendada', 'El inspector la verá en su lista de pendientes.', [
        { text: 'Agendar otra', style: 'cancel' },
        { text: 'Ver inspecciones', onPress: () => navigation.getParent()?.navigate('InspeccionesTab') },
      ]);
    } catch (e) {
      Alert.alert('No se pudo agendar', e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionTitle>1. CAMIÓN</SectionTitle>
      {data.camiones.map((c) => {
        const seleccionado = camionId === c.id;
        return (
          <Card
            key={c.id}
            onPress={c.tiene_pendiente ? undefined : () => setCamionId(c.id)}
            style={[seleccionado && styles.cardSel, c.tiene_pendiente && { opacity: 0.55 }]}
          >
            <View style={styles.camRow}>
              <Plate patente={c.patente} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.camTitle}>
                  {c.marca} {c.modelo} {c.anio || ''}
                </Text>
                <Text style={styles.camSub}>
                  {CARROCERIAS[c.carroceria] || c.carroceria}
                  {c.empresa ? ` · ${c.empresa}` : ''}
                </Text>
                {c.tiene_pendiente ? <Text style={styles.camWarn}>Ya tiene una inspección pendiente</Text> : null}
              </View>
              {seleccionado ? <Ionicons name="checkmark-circle" size={24} color={colors.success} /> : null}
            </View>
          </Card>
        );
      })}

      <SectionTitle style={{ marginTop: spacing.lg }}>2. INSPECTOR</SectionTitle>
      <View style={styles.wrap}>
        {data.inspectores.map((i) => (
          <Chip key={i.id} label={i.nombre} selected={inspectorId === i.id} onPress={() => setInspectorId(i.id)} style={{ marginBottom: 8 }} />
        ))}
      </View>

      <SectionTitle style={{ marginTop: spacing.lg }}>3. FECHA Y HORA</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {dias.map((d, idx) => (
          <Chip
            key={idx}
            label={d.label}
            selected={diaIdx === idx}
            onPress={() => {
              setDiaIdx(idx);
              setHora(null);
            }}
          />
        ))}
      </ScrollView>
      <View style={[styles.wrap, { marginTop: spacing.md }]}>
        {HORAS.map((h) => (
          <Chip key={h} label={h} selected={hora === h} disabled={esPasada(h)} onPress={() => setHora(h)} style={{ marginBottom: 8 }} />
        ))}
      </View>

      <Field
        label="Lugar (opcional)"
        value={lugar}
        onChangeText={setLugar}
        placeholder="Ej: Planta Talca"
        style={{ marginTop: spacing.lg }}
      />

      <Button title="Agendar inspección" icon="calendar-outline" onPress={agendar} loading={enviando} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  cardSel: { borderColor: colors.success, borderWidth: 2 },
  camRow: { flexDirection: 'row', alignItems: 'center' },
  camTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  camSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  camWarn: { fontSize: 11.5, color: colors.warn, fontWeight: '600', marginTop: 3 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
