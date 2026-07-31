import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatShortDate, RoundStatusPill, RowChevron, StatePill } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { MONITORING_INSTRUMENTS, useMonitoringRound } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

const pointStatus = {
  cancelled: { label: 'Cancelado', tone: 'danger' as const },
  pending: { label: 'Pendiente', tone: 'warning' as const },
  skipped: { label: 'Omitido', tone: 'neutral' as const },
  taken: { label: 'Tomado', tone: 'success' as const },
};

export default function MonitoringRoundDetailScreen() {
  const params = useLocalSearchParams<{ roundId: string }>();
  const roundId = Array.isArray(params.roundId) ? params.roundId[0] : params.roundId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data: round, errorMessage, isLoading, isRefetching, refetch } = useMonitoringRound(roundId ?? null);
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const points = round?.points ?? [];
  const pending = points.filter((item) => item.status === 'pending').length;
  const taken = points.filter((item) => item.status === 'taken').length;

  return (
    <>
      <Stack.Screen options={{ title: round?.name ?? 'Ronda' }} />
      <View style={styles.container}>
        {round ? (
          <View style={styles.header}>
            <View style={styles.titleRow}><View><Text style={styles.title}>{round.name}</Text><Text style={styles.body}>{formatShortDate(round.roundDate)}</Text></View><RoundStatusPill status={round.status} /></View>
            <View style={styles.summary}><SummaryItem label="Pendientes" value={pending} /><SummaryItem label="Tomados" value={taken} /><SummaryItem label="Total" value={points.length} /></View>
            <Text style={styles.body}>{round.instrumentSerial ? `Serie ${round.instrumentSerial}` : 'Serie de instrumento sin indicar'}{round.fieldConditions ? ` · Condición ${round.fieldConditions}` : ''}</Text>
            {canEdit ? <Pressable onPress={() => router.push(`/rounds/${round.id}/add-point` as never)} style={styles.primaryButton}><MaterialIcons color={colors.background} name="add" size={19} /><Text style={styles.primaryButtonText}>Añadir punto</Text></Pressable> : null}
          </View>
        ) : null}
        {errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo cargar la ronda</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        <FlatList
          contentContainerStyle={[styles.list, { paddingBottom: 32 + insets.bottom }]}
          data={points}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          renderItem={({ item }) => {
            const instrument = MONITORING_INSTRUMENTS.find((option) => option.value === item.expectedInstrumentType);
            const status = pointStatus[item.status];
            return (
              <Pressable
                disabled={!canEdit}
                onPress={() => router.push({ pathname: '/round-points/[roundPointId]/reading', params: { controlPointId: item.controlPointId, code: item.controlPointCode, instrumentType: item.expectedInstrumentType, name: item.controlPointName ?? '', roundId: round?.id ?? '', roundPointId: item.id } } as never)}
                style={[styles.pointCard, !canEdit ? styles.disabled : null]}
              >
                <View style={styles.cardTop}><StatePill label={status.label} tone={status.tone} />{canEdit ? <RowChevron /> : null}</View>
                <Text style={styles.pointCode}>{item.controlPointCode}</Text>
                <Text numberOfLines={1} style={styles.pointName}>{item.controlPointName ?? 'Sin nombre'}</Text>
                <Text style={styles.meta}>{instrument?.label ?? item.expectedInstrumentType}</Text>
                {item.notes ? <Text numberOfLines={2} style={styles.body}>{item.notes}</Text> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><MaterialIcons color={colors.textSecondary} name="playlist-add" size={30} /><Text style={styles.emptyTitle}>{isLoading ? 'Cargando puntos...' : 'Esta ronda no tiene puntos'}</Text><Text style={styles.body}>{canEdit ? 'Añade los puntos de control que vas a medir.' : 'No hay puntos para consultar.'}</Text></View>}
        />
      </View>
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return <View style={styles.summaryItem}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 20 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  container: { backgroundColor: colors.background, flex: 1 },
  disabled: { opacity: 0.7 },
  empty: { alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[4], paddingTop: spacing[5] },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '800' },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, marginHorizontal: spacing[3], padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800' },
  header: { gap: spacing[2], padding: spacing[3] },
  list: { gap: spacing[2], padding: spacing[3] },
  meta: { color: colors.accentGreen, fontSize: 13, fontWeight: '800' },
  pointCard: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  pointCode: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900' },
  pointName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  primaryButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.accentGreen, borderRadius: 8, flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '900' },
  summary: { flexDirection: 'row', gap: spacing[1] },
  summaryItem: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, flex: 1, padding: spacing[1] },
  summaryLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900' },
  title: { color: colors.textPrimary, fontSize: 25, fontWeight: '900' },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
});
