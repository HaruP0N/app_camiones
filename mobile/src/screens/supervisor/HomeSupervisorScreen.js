import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InspeccionCard from '../../components/InspeccionCard';
import { Chip, EmptyState, ErrorState, Loading } from '../../components/ui';
import { api } from '../../api';
import { useFocusFetch } from '../../hooks';
import { colors, spacing } from '../../theme';

const FILTROS = [
  { label: 'Todas', value: undefined },
  { label: 'Programadas', value: 'PROGRAMADA' },
  { label: 'En progreso', value: 'EN_PROGRESO' },
  { label: 'Completadas', value: 'COMPLETADA' },
];

export default function HomeSupervisorScreen({ navigation }) {
  const [estado, setEstado] = useState(undefined);
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');

  // Espera 350 ms después de escribir para buscar
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 350);
    return () => clearTimeout(t);
  }, [texto]);

  const fetcher = useCallback(() => api.getInspecciones({ estado, q }).then((r) => r.inspecciones), [estado, q]);
  const { data, error, loading, refreshing, refresh, reload } = useFocusFetch(fetcher);

  const header = (
    <View style={styles.header}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Buscar por patente"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.searchInput}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginTop: spacing.md }}>
        {FILTROS.map((f) => (
          <Chip key={f.label} label={f.label} selected={estado === f.value} onPress={() => setEstado(f.value)} />
        ))}
      </ScrollView>
      <Text style={styles.count}>{data ? `${data.length} inspección${data.length === 1 ? '' : 'es'}` : ' '}</Text>
    </View>
  );

  return (
    <View style={styles.flex}>
      {header}
      {loading ? (
        <Loading />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}
          ListEmptyComponent={<EmptyState icon="search" title="Sin resultados" text="No hay inspecciones que coincidan con el filtro." />}
          renderItem={({ item }) => <InspeccionCard item={item} showInspector onPress={() => navigation.navigate('Detalle', { id: item.id })} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, backgroundColor: colors.bg },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 15, color: colors.text },
  count: { fontSize: 12.5, color: colors.muted, marginTop: spacing.md, marginBottom: 2 },
  list: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 },
});
