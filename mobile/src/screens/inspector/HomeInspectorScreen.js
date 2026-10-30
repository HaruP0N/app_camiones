import React, { useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import InspeccionCard from '../../components/InspeccionCard';
import { EmptyState, ErrorState, Loading } from '../../components/ui';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api';
import { useFocusFetch } from '../../hooks';
import { colors, spacing } from '../../theme';

export default function HomeInspectorScreen({ navigation }) {
  const { user } = useAuth();
  const fetcher = useCallback(() => api.getInspecciones({ estado: 'PROGRAMADA,EN_PROGRESO' }).then((r) => r.inspecciones), []);
  const { data, error, loading, refreshing, refresh, reload } = useFocusFetch(fetcher);

  if (loading) return <Loading text="Cargando tus inspecciones…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  return (
    <FlatList
      data={data || []}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} colors={[colors.ink]} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.hello}>Hola, {user.nombre.split(' ')[0]}</Text>
          <Text style={styles.sub}>
            {data && data.length > 0
              ? `Tienes ${data.length} inspección${data.length === 1 ? '' : 'es'} pendiente${data.length === 1 ? '' : 's'}`
              : 'Estás al día'}
          </Text>
          {error ? <Text style={styles.warn}>No se pudo actualizar: {error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState icon="checkmark-done-outline" title="No tienes inspecciones pendientes" text="Cuando tu supervisor te asigne una, aparecerá aquí. Desliza hacia abajo para actualizar." />
      }
      renderItem={({ item }) => <InspeccionCard item={item} onPress={() => navigation.navigate('Checklist', { id: item.id })} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  header: { marginBottom: spacing.lg },
  hello: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  sub: { fontSize: 13.5, color: colors.muted, marginTop: 3 },
  warn: { fontSize: 12.5, color: colors.danger, marginTop: 6 },
});
