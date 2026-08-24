import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MonitoringRoundStatus } from '@shared/types';
import { ChoiceChip, formatShortDate, RoundStatusPill, RowChevron } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useMonitoringRounds } from '@/hooks/use-monitoring';
import { useProjects } from '@/hooks/use-projects';
import { colors, spacing, typography } from '@/src/theme';

const FILTERS: Array<{ label: string; value: MonitoringRoundStatus | null }> = [
  { label: 'Todas', value: null },
  { label: 'Activas', value: 'active' },
  { label: 'Borradores', value: 'draft' },
  { label: 'Cerradas', value: 'closed' },
];

export default function MonitoringRoundsScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data: projects } = useProjects();
  const [status, setStatus] = useState<MonitoringRoundStatus | null>(null);
  const { cachedAt, data, errorMessage, isLoading, isOfflineCache, isRefetching, refetch } = useMonitoringRounds(projectId ?? null, status ?? undefined);
  const project = useMemo(() => (projects ?? []).find((item) => item.id === projectId), [projectId, projects]);
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const rounds = data ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Auscultación' }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{project?.name ?? 'Obra'}</Text>
          <Text style={styles.title}>Rondas de control</Text>
          <Text style={styles.body}>Prepara la ronda y registra lecturas de campo sin perder el orden de los puntos.</Text>
          <View style={styles.actions}>
            {canEdit ? (
              <Pressable onPress={() => router.push(`/projects/${projectId}/rounds/new` as never)} style={styles.primaryButton}>
                <MaterialIcons color={colors.background} name="add" size={19} />
                <Text style={styles.primaryButtonText}>Nueva ronda</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.push(`/projects/${projectId}/control-points` as never)} style={styles.secondaryButton}>
              <MaterialIcons color={colors.textPrimary} name="place" size={18} />
              <Text style={styles.secondaryButtonText}>Puntos</Text>
            </Pressable>
          </View>
          <View style={styles.filters}>
            {FILTERS.map((filter) => (
              <ChoiceChip key={filter.label} label={filter.label} onPress={() => setStatus(filter.value)} selected={status === filter.value} />
            ))}
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Text style={styles.errorTitle}>No se pudieron cargar las rondas</Text>
              <Pressable accessibilityLabel="Reintentar carga de rondas" onPress={() => void refetch()} style={styles.retryButton}>
                <MaterialIcons color={colors.textPrimary} name="refresh" size={18} />
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
            <Text style={styles.body}>{errorMessage}</Text>
          </View>
        ) : null}
        {isOfflineCache ? <Text style={styles.warningText}>Rondas sin actualizar. Última copia: {cachedAt ?? 'fecha desconocida'}.</Text> : null}

        <FlatList
          contentContainerStyle={[styles.list, { paddingBottom: 32 + insets.bottom }]}
          data={rounds}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/rounds/${item.id}` as never)} style={styles.roundCard}>
              <View style={styles.cardTop}>
                <RoundStatusPill status={item.status} />
                <RowChevron />
              </View>
              <Text style={styles.roundName}>{item.name}</Text>
              <Text style={styles.roundMeta}>{formatShortDate(item.roundDate)}</Text>
              <Text numberOfLines={1} style={styles.roundMeta}>
                {item.instrumentSerial ? `Serie ${item.instrumentSerial}` : 'Instrumento sin serie'}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            errorMessage ? null : (
              <View style={styles.empty}>
                <MaterialIcons color={colors.textSecondary} name="timeline" size={30} />
                <Text style={styles.emptyTitle}>{isLoading ? 'Cargando rondas...' : 'No hay rondas en esta obra'}</Text>
                <Text style={styles.body}>{canEdit ? 'Crea una ronda y añade los puntos que vas a medir.' : 'No hay rondas disponibles para consultar.'}</Text>
                {!isLoading && canEdit ? (
                  <View style={styles.emptyActions}>
                    <Pressable onPress={() => router.push(`/projects/${projectId}/rounds/new` as never)} style={styles.primaryButton}>
                      <MaterialIcons color={colors.background} name="add" size={19} />
                      <Text style={styles.primaryButtonText}>Crear primera ronda</Text>
                    </Pressable>
                    <Pressable onPress={() => router.push(`/projects/${projectId}/control-points` as never)} style={styles.secondaryButton}>
                      <MaterialIcons color={colors.textPrimary} name="place" size={18} />
                      <Text style={styles.secondaryButtonText}>Preparar puntos</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  container: { backgroundColor: colors.background, flex: 1 },
  empty: { alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[4], paddingTop: spacing[5] },
  emptyActions: { alignItems: 'stretch', gap: spacing[1], marginTop: spacing[1], width: '100%' },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '800' },
  errorCard: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, marginHorizontal: spacing[3], padding: spacing[3] },
  errorHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing[1] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800', marginBottom: spacing[0] },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  header: { gap: spacing[1], padding: spacing[3] },
  list: { gap: spacing[2], padding: spacing[3] },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '900' },
  retryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  retryText: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  roundCard: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  roundMeta: { color: colors.textSecondary, fontSize: 13 },
  roundName: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
  warningText: { color: colors.amber, fontSize: 13, fontWeight: '700', lineHeight: 20, paddingHorizontal: spacing[3] },
});
