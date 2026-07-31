import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChip, RowChevron, StatePill } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useControlPoints } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

export default function ControlPointsScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const [active, setActive] = useState<boolean | undefined>(true);
  const { data, errorMessage, isLoading, isRefetching, refetch } = useControlPoints(projectId ?? null, active);
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'topografo';

  return (
    <>
      <Stack.Screen options={{ title: 'Puntos de control' }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Puntos de control</Text>
          <Text style={styles.body}>Referencias estables que se incorporan a las rondas de auscultación.</Text>
          <View style={styles.actionRow}>
            {canEdit ? <Pressable onPress={() => router.push(`/projects/${projectId}/control-points/new` as never)} style={styles.primaryButton}><MaterialIcons color={colors.background} name="add-location-alt" size={18} /><Text style={styles.primaryButtonText}>Nuevo punto</Text></Pressable> : null}
          </View>
          <View style={styles.filters}>
            <ChoiceChip label="Activos" onPress={() => setActive(true)} selected={active === true} />
            <ChoiceChip label="Inactivos" onPress={() => setActive(false)} selected={active === false} />
            <ChoiceChip label="Todos" onPress={() => setActive(undefined)} selected={active === undefined} />
          </View>
        </View>
        {errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudieron cargar los puntos</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        <FlatList
          contentContainerStyle={[styles.list, { paddingBottom: 32 + insets.bottom }]}
          data={data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/control-points/[controlPointId]', params: { controlPointId: item.id, code: item.code, name: item.name ?? '', projectId: projectId ?? '' } } as never)} style={styles.pointCard}>
              <View style={styles.cardTop}><StatePill label={item.isActive ? 'Activo' : 'Inactivo'} tone={item.isActive ? 'success' : 'neutral'} /><RowChevron /></View>
              <Text style={styles.code}>{item.code}</Text>
              <Text numberOfLines={1} style={styles.name}>{item.name ?? 'Sin nombre'}</Text>
              <Text style={styles.meta}>{item.environment === 'tunnel' ? 'Túnel' : item.environment === 'surface' ? 'Superficie' : 'Otro'}{item.pk ? ` · PK ${item.pk}` : ''}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.empty}><MaterialIcons color={colors.textSecondary} name="place" size={30} /><Text style={styles.emptyTitle}>{isLoading ? 'Cargando puntos...' : 'No hay puntos en este filtro'}</Text><Text style={styles.body}>{canEdit ? 'Crea el primer punto para añadirlo a una ronda.' : 'No hay puntos disponibles para consultar.'}</Text></View>}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', flexWrap: 'wrap' },
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  code: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900' },
  container: { backgroundColor: colors.background, flex: 1 },
  empty: { alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[4], paddingTop: spacing[5] },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '800' },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, marginHorizontal: spacing[3], padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800', marginBottom: spacing[0] },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  header: { gap: spacing[1], padding: spacing[3] },
  list: { gap: spacing[2], padding: spacing[3] },
  meta: { color: colors.textSecondary, fontSize: 13 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  pointCard: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '900' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
});
