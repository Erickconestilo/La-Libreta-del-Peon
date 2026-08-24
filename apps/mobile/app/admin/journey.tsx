import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatShortDate, RoundStatusPill } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useMonitoringRounds, useProjectOperators, useUpdateMonitoringRoundAssignment } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

export default function AdminJourneyScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const { currentUser } = useCurrentSession();
  const { data: rounds = [], errorMessage: roundsError, isLoading: roundsLoading } = useMonitoringRounds(projectId ?? null);
  const { data: operators = [], errorMessage: operatorsError } = useProjectOperators(projectId ?? null);
  const { errorMessage: updateError, isUpdating, updateAssignment } = useUpdateMonitoringRoundAssignment();
  const [message, setMessage] = useState<string | null>(null);
  const orderedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.roundDate.localeCompare(b.roundDate) || a.executionOrder - b.executionOrder),
    [rounds]
  );

  if (currentUser?.role !== 'admin') {
    return <View style={styles.restricted}><Text style={styles.title}>Acceso restringido</Text><Text style={styles.body}>Solo admin puede organizar Mi jornada.</Text></View>;
  }

  const assign = async (roundId: string, operatorId: string | null) => {
    try {
      await updateAssignment({ input: { operatorId }, roundId });
      setMessage('Asignación guardada.');
    } catch {
      setMessage(null);
    }
  };

  const updateField = async (roundId: string, input: { executionOrder?: number; roundDate?: string }) => {
    try {
      await updateAssignment({ input, roundId });
      setMessage('Planificación guardada.');
    } catch {
      setMessage(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Organizar jornada' }} />
      <ScrollView contentContainerStyle={styles.content} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Administración</Text>
          <Text style={styles.title}>Organizar Mi jornada</Text>
          <Text style={styles.body}>Asigna cada ronda a un topógrafo de esta obra y define el orden de ejecución.</Text>
        </View>
        {roundsError || operatorsError ? <Text style={styles.error}>{roundsError ?? operatorsError}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {roundsLoading ? <Text style={styles.body}>Cargando rondas...</Text> : null}
        {!roundsLoading && orderedRounds.length === 0 ? <Text style={styles.body}>No hay rondas para organizar.</Text> : null}
        {orderedRounds.map((round) => (
          <View key={round.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleBlock}>
                <Text style={styles.cardTitle}>{round.name}</Text>
                <Text style={styles.meta}>{formatShortDate(round.roundDate)} · orden {round.executionOrder}</Text>
              </View>
              <RoundStatusPill status={round.status} />
            </View>
            <Text style={styles.label}>Fecha</Text>
            <TextInput
              defaultValue={round.roundDate}
              editable={!isUpdating && round.status !== 'closed' && round.status !== 'cancelled'}
              onEndEditing={(event) => {
                const value = event.nativeEvent.text.trim();
                if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value !== round.roundDate) void updateField(round.id, { roundDate: value });
              }}
              style={styles.input}
            />
            <Text style={styles.label}>Orden de ejecución</Text>
            <TextInput
              defaultValue={String(round.executionOrder)}
              editable={!isUpdating && round.status !== 'closed' && round.status !== 'cancelled'}
              keyboardType="number-pad"
              onEndEditing={(event) => {
                const value = Number.parseInt(event.nativeEvent.text, 10);
                if (Number.isInteger(value) && value >= 0 && value !== round.executionOrder) void updateField(round.id, { executionOrder: value });
              }}
              style={styles.input}
            />
            <Text style={styles.label}>Topógrafo asignado</Text>
            <View style={styles.operatorList}>
              <Pressable disabled={isUpdating || round.status === 'closed' || round.status === 'cancelled'} onPress={() => void assign(round.id, null)} style={[styles.operatorButton, !round.operatorId ? styles.operatorSelected : null]}>
                <MaterialIcons color={!round.operatorId ? colors.background : colors.textSecondary} name="person-off" size={17} />
                <Text style={[styles.operatorText, !round.operatorId ? styles.operatorTextSelected : null]}>Sin asignar</Text>
              </Pressable>
              {operators.map((operator) => {
                const selected = round.operatorId === operator.id;
                return (
                  <Pressable key={operator.id} disabled={isUpdating || round.status === 'closed' || round.status === 'cancelled'} onPress={() => void assign(round.id, operator.id)} style={[styles.operatorButton, selected ? styles.operatorSelected : null]}>
                    <MaterialIcons color={selected ? colors.background : colors.textSecondary} name="person" size={17} />
                    <Text style={[styles.operatorText, selected ? styles.operatorTextSelected : null]}>{operator.fullName || operator.email}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        {updateError ? <Text style={styles.error}>{updateError}</Text> : null}
        <Text style={styles.footnote}>Los cambios de asignación no borran lecturas ni fotos preparadas en un dispositivo. Si existe una jornada offline, el móvil mostrará el conflicto.</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing[1] },
  cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  cardTitleBlock: { flex: 1, gap: 2 },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  error: { color: colors.red, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  footnote: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, paddingBottom: spacing[4] },
  header: { gap: spacing[1] },
  input: { backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, color: colors.textPrimary, fontSize: 15, padding: spacing[1] },
  label: { color: colors.textPrimary, fontSize: 13, fontWeight: '800', marginTop: spacing[1] },
  meta: { color: colors.textSecondary, fontSize: 13 },
  operatorButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  operatorList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  operatorSelected: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  operatorText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  operatorTextSelected: { color: colors.background },
  restricted: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing[2], justifyContent: 'center', padding: spacing[4] },
  success: { color: colors.accentGreen, fontSize: 13, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' }
});
