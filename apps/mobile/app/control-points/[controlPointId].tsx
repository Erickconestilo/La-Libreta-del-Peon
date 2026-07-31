import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChip, formatShortDate, StatePill } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { MONITORING_INSTRUMENTS, type MonitoringInstrumentType, useControlPoints, useReadingHistory, useUpdateControlPoint } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

export default function ControlPointDetailScreen() {
  const params = useLocalSearchParams<{ code: string; controlPointId: string; name: string; projectId: string }>();
  const controlPointId = Array.isArray(params.controlPointId) ? params.controlPointId[0] : params.controlPointId;
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data: points } = useControlPoints(projectId ?? null);
  const point = useMemo(() => (points ?? []).find((item) => item.id === controlPointId), [controlPointId, points]);
  const [instrumentType, setInstrumentType] = useState<MonitoringInstrumentType | undefined>(undefined);
  const { data, errorMessage, isLoading, isRefetching, refetch } = useReadingHistory(controlPointId ?? null, instrumentType);
  const { errorMessage: updateError, isUpdating, updateControlPoint } = useUpdateControlPoint(projectId ?? null, controlPointId ?? null);
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const pointCode = point?.code ?? (Array.isArray(params.code) ? params.code[0] : params.code) ?? 'Punto';
  const pointName = point?.name ?? (Array.isArray(params.name) ? params.name[0] : params.name);

  const handleToggle = () => {
    if (!point) return;
    void updateControlPoint({ isActive: !point.isActive });
  };

  return (
    <>
      <Stack.Screen options={{ title: pointCode }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}><View><Text style={styles.title}>{pointCode}</Text><Text style={styles.body}>{pointName || 'Punto de control'}</Text></View>{point ? <StatePill label={point.isActive ? 'Activo' : 'Inactivo'} tone={point.isActive ? 'success' : 'neutral'} /> : null}</View>
          {point ? <Text style={styles.body}>{point.environment}{point.pk ? ` · PK ${point.pk}` : ''}{point.zona ? ` · ${point.zona}` : ''}</Text> : null}
          {canEdit && point ? <Pressable disabled={isUpdating} onPress={handleToggle} style={[styles.secondaryButton, isUpdating ? styles.disabled : null]}><Text style={styles.secondaryButtonText}>{isUpdating ? 'Actualizando...' : point.isActive ? 'Desactivar punto' : 'Activar punto'}</Text></Pressable> : null}
          <Text style={styles.sectionTitle}>Histórico</Text>
          <View style={styles.chips}><ChoiceChip label="Todos" onPress={() => setInstrumentType(undefined)} selected={!instrumentType} />{MONITORING_INSTRUMENTS.map((item) => <ChoiceChip key={item.value} label={item.label} onPress={() => setInstrumentType(item.value)} selected={instrumentType === item.value} />)}</View>
        </View>
        {errorMessage ?? updateError ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo completar la operación</Text><Text style={styles.body}>{errorMessage ?? updateError}</Text></View> : null}
        <FlatList
          contentContainerStyle={[styles.list, { paddingBottom: 32 + insets.bottom }]}
          data={data ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
          renderItem={({ item }) => <View style={styles.readingCard}><View style={styles.readingTop}><StatePill label={item.readingStatus === 'confirmed' ? 'Confirmada' : item.readingStatus === 'reviewed' ? 'Revisada' : item.readingStatus === 'rejected' ? 'Rechazada' : 'Pendiente'} tone={item.readingStatus === 'confirmed' || item.readingStatus === 'reviewed' ? 'success' : item.readingStatus === 'rejected' ? 'danger' : 'warning'} /><Text style={styles.date}>{formatShortDate(item.measuredAt)}</Text></View><Text style={styles.value}>{item.valueNumeric ?? item.valueText ?? 'Sin valor'}{item.unit ? ` ${item.unit}` : ''}</Text><Text style={styles.instrument}>{MONITORING_INSTRUMENTS.find((option) => option.value === item.instrumentType)?.label ?? item.instrumentType}</Text>{item.notes ? <Text style={styles.body}>{item.notes}</Text> : null}</View>}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{isLoading ? 'Cargando histórico...' : 'Sin lecturas registradas'}</Text><Text style={styles.body}>Las lecturas confirmadas aparecerán aquí cuando se sincronicen.</Text></View>}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  container: { backgroundColor: colors.background, flex: 1 },
  date: { color: colors.textSecondary, fontSize: 12 },
  disabled: { opacity: 0.55 },
  empty: { alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[4], paddingTop: spacing[5] },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '800' },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, marginHorizontal: spacing[3], padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800' },
  header: { gap: spacing[1], padding: spacing[3] },
  instrument: { color: colors.accentGreen, fontSize: 13, fontWeight: '800' },
  list: { gap: spacing[2], padding: spacing[3] },
  readingCard: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  readingTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  secondaryButton: { alignItems: 'center', alignSelf: 'flex-start', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900', marginTop: spacing[1] },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  value: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900' },
});
