import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import InspeccionCard from '../../components/InspeccionCard';
import { EmptyState, ErrorState, Loading } from '../../components/ui';
import { api } from '../../api';
import { useFocusFetch } from '../../hooks';
import { colors, spacing } from '../../theme';

export default function HistorialScreen({ navigation }) {
  const fetcher = useCallback(() => api.getInspecciones({ estado: 'COMPLETADA' }).then((r) => r.inspecciones), []);
  const { data, error, loading, refreshing, refresh, reload } = useFocusFetch(fetcher);

  if (loading) return <Loading text="Cargando historial…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <FlatList
      data={data || []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}
      ListEmptyComponent={<EmptyState icon="time-outline" title="Aún no has completado inspecciones" text="Las inspecciones que finalices quedarán registradas aquí." />}
      renderItem={({ item }) => <InspeccionCard item={item} onPress={() => navigation.navigate('Detalle', { id: item.id })} />}
    />
  );
}

const styles = StyleSheet.create({ list: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 } });
