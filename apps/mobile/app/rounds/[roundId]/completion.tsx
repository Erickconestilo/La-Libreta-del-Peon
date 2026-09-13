import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WorkCompletionStatus } from '@shared/types';
import { ChoiceChip, formatShortDate } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useCreateWorkCompletionReport, useMonitoringRound } from '@/hooks/use-monitoring';
import { getWriteScreenAccessState } from '@/lib/field-access';
import { getWorkExecutionSummary } from '@/lib/work-execution';
import { colors, spacing, typography } from '@/src/theme';

const STATUS_OPTIONS: Array<{ label: string; value: WorkCompletionStatus }> = [
  { label: 'Parcial', value: 'partial' },
  { label: 'Completado', value: 'completed' },
  { label: 'Bloqueado', value: 'blocked' }
];

export default function WorkCompletionScreen() {
  const params = useLocalSearchParams<{ roundId: string }>();
  const roundId = Array.isArray(params.roundId) ? params.roundId[0] : params.roundId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data: round, errorMessage: roundError, isLoading: isRoundLoading } = useMonitoringRound(roundId ?? null);
  const { createReport, errorMessage, isCreating } = useCreateWorkCompletionReport(roundId ?? null);
  const writeScreenState = getWriteScreenAccessState(currentUser, round?.projectId, Boolean(round));
  const pendingPointCount = useMemo(
    () => round?.points.filter((point) => point.status === 'pending').length ?? 0,
    [round?.points]
  );
  const workSummary = useMemo(
    () => getWorkExecutionSummary(round?.points ?? []),
    [round?.points]
  );
  const [status, setStatus] = useState<WorkCompletionStatus>(pendingPointCount > 0 ? 'partial' : 'completed');
  const [zoneLabel, setZoneLabel] = useState('Zona de trabajo');
  const [pendingReasons, setPendingReasons] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (pendingPointCount > 0) {
      setStatus((current) => current === 'completed' ? 'partial' : current);
    }
  }, [pendingPointCount]);

  const startEditing = () => {
    setSaved(false);
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (status === 'completed' && pendingPointCount > 0) {
      Alert.alert('Quedan puntos pendientes', 'Usa Parte parcial o resuelve los puntos antes de marcar la zona como completada.');
      return;
    }

    try {
      const result = await createReport({
        notes: notes.trim() || null,
        pendingReasons: pendingReasons
          .split('\n')
          .map((reason) => reason.trim())
          .filter(Boolean),
        status,
        zoneLabel: zoneLabel.trim()
      });
      setFeedback(
        result.mode === 'queued'
          ? 'Parte guardado en este dispositivo. Se enviará al recuperar conexión.'
          : 'Parte recibido por el servidor. El supervisor podrá consultarlo.'
      );
      setSaved(true);
    } catch {
      // El hook expone el motivo debajo del formulario.
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Parte de zona' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Finalización de visita</Text>
          <Text style={styles.title}>{round?.name ?? 'Ronda'}</Text>
          <Text style={styles.body}>
            {round ? `${formatShortDate(round.roundDate)} · Lectura: ${round.points.length - pendingPointCount}/${round.points.length} puntos con estado final` : 'Comprueba el resultado antes de enviarlo.'}
          </Text>
          {round ? <View style={styles.workSummary}>
            <Text style={styles.workSummaryTitle}>Trabajo declarado por el operario</Text>
            <Text style={styles.body}>{workSummary.completed} hechos · {workSummary.in_progress} en curso · {workSummary.pending} pendientes · {workSummary.repeat_required + workSummary.not_done + workSummary.blocked} por revisar</Text>
            <Text style={styles.caption}>Marcar un trabajo como hecho no sustituye la lectura ni permite cerrar la ronda si quedan puntos metrológicos pendientes.</Text>
          </View> : null}
        </View>

        {isRoundLoading && !round ? <View style={styles.card}><Text style={styles.body}>Cargando la ronda...</Text></View> : null}
        {roundError ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo cargar la ronda</Text><Text style={styles.body}>{roundError}</Text></View> : null}
        {writeScreenState === 'read-only' ? (
          <View style={styles.readOnlyCard}>
            <MaterialIcons color="#7dd3fc" name="visibility" size={22} />
            <View style={styles.readOnlyCopy}>
              <Text style={styles.readOnlyTitle}>Consulta de solo lectura</Text>
              <Text style={styles.body}>Esta cuenta puede consultar la ronda, pero no crear partes ni modificar su estado.</Text>
            </View>
          </View>
        ) : null}
        {writeScreenState === 'allowed' ? <View style={styles.card}>
          <Text style={styles.label}>Zona o tramo trabajado</Text>
          <TextInput onChangeText={(value) => { startEditing(); setZoneLabel(value); }} placeholder="Ej. Zona de acceso norte" placeholderTextColor="#64748b" style={styles.input} value={zoneLabel} />
          <Text style={styles.label}>Resultado de la visita</Text>
          <View style={styles.chips}>
            {STATUS_OPTIONS.map((option) => (
              <ChoiceChip key={option.value} label={option.label} onPress={() => { startEditing(); setStatus(option.value); }} selected={status === option.value} />
            ))}
          </View>
          {pendingPointCount > 0 ? <Text style={styles.warningText}>Hay {pendingPointCount} punto{pendingPointCount === 1 ? '' : 's'} pendiente{pendingPointCount === 1 ? '' : 's'}; un parte completado está bloqueado.</Text> : null}
          <Text style={styles.label}>Motivos pendientes, uno por línea</Text>
          <TextInput multiline onChangeText={(value) => { startEditing(); setPendingReasons(value); }} placeholder="Sin acceso\nSensor dañado" placeholderTextColor="#64748b" style={[styles.input, styles.multiline]} value={pendingReasons} />
          <Text style={styles.label}>Notas para el relevo</Text>
          <TextInput multiline onChangeText={(value) => { startEditing(); setNotes(value); }} placeholder="Qué debe saber el supervisor o el siguiente turno" placeholderTextColor="#64748b" style={[styles.input, styles.multiline]} value={notes} />
        </View> : null}

        {writeScreenState === 'allowed' ? <>
          {feedback ? <View style={styles.success}><MaterialIcons color={colors.accentGreen} name="check-circle" size={20} /><Text style={styles.successText}>{feedback}</Text></View> : null}
          {errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo guardar el parte</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
          <Pressable disabled={isCreating || saved || !zoneLabel.trim()} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating || saved ? styles.disabled : null]}>
            <MaterialIcons color={colors.background} name="assignment-turned-in" size={19} />
            <Text style={styles.primaryButtonText}>{isCreating ? 'Guardando...' : saved ? 'Parte guardado' : 'Guardar parte'}</Text>
          </Pressable>
        </> : null}
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Volver a la ronda</Text></Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, gap: spacing[1], padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800' },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  hero: { gap: spacing[0], paddingVertical: spacing[2] },
  input: { backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, color: colors.textPrimary, fontSize: typography.fontSizeBody, padding: spacing[2] },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, flexDirection: 'row', gap: spacing[1], justifyContent: 'center', paddingVertical: spacing[3] },
  primaryButtonText: { color: colors.background, fontSize: typography.fontSizeBody, fontWeight: '900' },
  readOnlyCard: { alignItems: 'flex-start', backgroundColor: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.45)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[2], padding: spacing[3] },
  readOnlyCopy: { flex: 1, gap: spacing[1] },
  readOnlyTitle: { color: '#7dd3fc', fontSize: typography.fontSizeBody, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, paddingVertical: spacing[2] },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  success: { alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.4)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], padding: spacing[3] },
  successText: { color: colors.accentGreen, flex: 1, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
  warningText: { color: colors.amber, fontSize: 13, fontWeight: '800', lineHeight: 20 },
  workSummary: { backgroundColor: 'rgba(34, 197, 94, 0.06)', borderColor: 'rgba(34, 197, 94, 0.35)', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[2] },
  workSummaryTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' }
});
