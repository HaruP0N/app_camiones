import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Card, Plate } from './ui';
import { colors } from '../theme';
import { CARROCERIAS, ESTADOS, RESULTADOS, formatFechaHora } from '../utils';

export default function InspeccionCard({ item, onPress, showInspector }) {
  const completada = item.estado === 'COMPLETADA';
  const badge = completada && item.resultado ? RESULTADOS[item.resultado] : ESTADOS[item.estado];

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Plate patente={item.patente} />
        {badge ? <Badge label={badge.label} fg={badge.fg} bg={badge.bg} /> : null}
      </View>

      <Text style={styles.title}>
        {item.marca} {item.modelo} {item.anio || ''}
      </Text>
      <Text style={styles.sub}>
        {CARROCERIAS[item.carroceria] || item.carroceria}
        {item.empresa ? ` · ${item.empresa}` : ''}
      </Text>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.meta}>
            {formatFechaHora(completada ? item.fecha_completacion || item.fecha_programada : item.fecha_programada)}
            {item.lugar ? ` · ${item.lugar}` : ''}
          </Text>
          {showInspector ? <Text style={styles.meta}>Inspector: {item.inspector_nombre}</Text> : null}
        </View>
        {completada && item.nota_final !== null && item.nota_final !== undefined ? (
          <Text style={styles.nota}>
            {item.nota_final}
            <Text style={styles.notaMax}>/100</Text>
          </Text>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  nota: { fontSize: 20, fontWeight: '800', color: colors.ink },
  notaMax: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
