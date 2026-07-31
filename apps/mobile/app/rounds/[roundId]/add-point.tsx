import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChip, RowChevron } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { MONITORING_INSTRUMENTS, type MonitoringInstrumentType, useControlPoints, useCreateRoundPoint, useMonitoringRound } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

export default function AddRoundPointScreen() {
  const params = useLocalSearchParams<{ roundId: string }>();
  const roundId = Array.isArray(params.roundId) ? params.roundId[0] : params.roundId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data: round } = useMonitoringRound(roundId ?? null);
  const { data: controlPoints, errorMessage: pointsError, isLoading } = useControlPoints(round?.projectId ?? null, true);
  const { createRoundPoint, errorMessage, isCreating } = useCreateRoundPoint(roundId ?? null);
  const [selectedControlPointId, setSelectedControlPointId] = useState<string | null>(null);
  const [instrumentType, setInstrumentType] = useState<MonitoringInstrumentType>('digital_level');
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const availablePoints = useMemo(() => {
    const alreadyAdded = new Set((round?.points ?? []).map((item) => item.controlPointId));
    return (controlPoints ?? []).filter((item) => !alreadyAdded.has(item.id));
  }, [controlPoints, round?.points]);

  const handleSubmit = async () => {
    if (!selectedControlPointId) {
      Alert.alert('Selecciona un punto', 'Elige el punto de control que vas a añadir a la ronda.');
      return;
    }
    try {
      await createRoundPoint({ controlPointId: selectedControlPointId, expectedInstrumentType: instrumentType, notes: null, sortOrder: round?.points.length ?? 0 });
      router.back();
    } catch {
      // El error se muestra en pantalla.
    }
  };

  if (!canEdit) {
    return <View style={styles.restricted}><Text style={styles.title}>Acción restringida</Text><Text style={styles.body}>Solo admin y topógrafo pueden preparar una ronda.</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Añadir punto' }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Añadir punto</Text>
          <Text style={styles.body}>Selecciona una referencia activa y el instrumento que se utilizará en esta pasada.</Text>
          <Text style={styles.label}>Instrumento</Text>
          <View style={styles.chips}>{MONITORING_INSTRUMENTS.map((item) => <ChoiceChip key={item.value} label={item.label} onPress={() => setInstrumentType(item.value)} selected={instrumentType === item.value} />)}</View>
          {errorMessage ?? pointsError ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo preparar el punto</Text><Text style={styles.body}>{errorMessage ?? pointsError}</Text></View> : null}
        </View>
        <FlatList
          contentContainerStyle={[styles.list, { paddingBottom: 86 + insets.bottom }]}
          data={availablePoints}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Pressable onPress={() => setSelectedControlPointId(item.id)} style={[styles.pointCard, selectedControlPointId === item.id ? styles.pointCardSelected : null]}><View><Text style={styles.code}>{item.code}</Text><Text style={styles.name}>{item.name ?? 'Sin nombre'}</Text><Text style={styles.meta}>{item.environment}</Text></View>{selectedControlPointId === item.id ? <Text style={styles.selectedText}>Seleccionado</Text> : <RowChevron />}</Pressable>}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{isLoading ? 'Cargando puntos...' : 'No quedan puntos activos por añadir'}</Text><Text style={styles.body}>Los puntos ya incluidos no se duplican dentro de una ronda.</Text></View>}
        />
        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}><Pressable disabled={isCreating || !selectedControlPointId} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating || !selectedControlPointId ? styles.disabled : null]}><Text style={styles.primaryButtonText}>{isCreating ? 'Añadiendo...' : 'Añadir a la ronda'}</Text></Pressable></View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  code: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900' },
  container: { backgroundColor: colors.background, flex: 1 },
  disabled: { opacity: 0.55 },
  empty: { alignItems: 'center', gap: spacing[1], paddingHorizontal: spacing[4], paddingTop: spacing[5] },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '800' },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, padding: spacing[2] },
  errorTitle: { color: colors.red, fontSize: 14, fontWeight: '800' },
  footer: { backgroundColor: colors.background, borderTopColor: '#2a2f3a', borderTopWidth: 1, padding: spacing[2] },
  header: { gap: spacing[1], padding: spacing[3] },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginTop: spacing[1] },
  list: { gap: spacing[1], padding: spacing[3] },
  meta: { color: colors.textSecondary, fontSize: 12 },
  name: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  pointCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing[2] },
  pointCardSelected: { borderColor: colors.accentGreen, borderWidth: 2 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, paddingVertical: spacing[2] },
  primaryButtonText: { color: colors.background, fontSize: typography.fontSizeBody, fontWeight: '900' },
  restricted: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing[2], justifyContent: 'center', padding: spacing[4] },
  selectedText: { color: colors.accentGreen, fontSize: 13, fontWeight: '900' },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '900' },
});
