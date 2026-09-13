import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WorkExecutionEventType } from '@shared/types';
import { StatePill } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useCreateWorkExecutionEvent, useMonitoringRound, useWorkExecutionEvents } from '@/hooks/use-monitoring';
import { getWriteScreenAccessState } from '@/lib/field-access';
import {
  getWorkExecutionStatePresentation,
  getWorkExecutionState,
  requiresWorkExecutionReason,
  WORK_EXECUTION_OPTIONS,
  WORK_EXECUTION_REASON_OPTIONS
} from '@/lib/work-execution';
import { colors, spacing, typography } from '@/src/theme';

export default function WorkStatusScreen() {
  const params = useLocalSearchParams<{ code: string; name: string; roundId: string; roundPointId: string }>();
  const roundId = Array.isArray(params.roundId) ? params.roundId[0] : params.roundId;
  const roundPointId = Array.isArray(params.roundPointId) ? params.roundPointId[0] : params.roundPointId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data: round, errorMessage: roundError, isLoading } = useMonitoringRound(roundId ?? null);
  const point = useMemo(() => round?.points.find((item) => item.id === roundPointId), [round?.points, roundPointId]);
  const { data: events, errorMessage: eventsError, isLoading: eventsLoading } = useWorkExecutionEvents(roundPointId ?? null);
  const accessState = getWriteScreenAccessState(currentUser, round?.projectId, Boolean(round));
  const { errorMessage, isCreating, recordResult } = useCreateWorkExecutionEvent({ roundId: roundId ?? null, roundPointId: roundPointId ?? null });
  const [selectedEvent, setSelectedEvent] = useState<WorkExecutionEventType | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedEvent) {
      setFeedback('Selecciona qué ha ocurrido con este trabajo.');
      return;
    }

    if (requiresWorkExecutionReason(selectedEvent) && !reason.trim()) {
      setFeedback('Indica el motivo para que el supervisor entienda qué ha pasado.');
      return;
    }

    try {
      const result = await recordResult({
        eventType: selectedEvent,
        notes: notes.trim() || null,
        reason: reason.trim() || null
      });
      setFeedback(
        result.mode === 'queued'
          ? 'Resultado guardado localmente. Se enviará al recuperar conexión.'
          : 'Resultado recibido por el servidor.'
      );
      setSelectedEvent(null);
      setReason('');
      setNotes('');
    } catch {
      // El hook expone el diagnóstico seguro debajo del formulario.
    }
  };

  const currentPresentation = getWorkExecutionStatePresentation(point?.executionState);
  const selectedOption = WORK_EXECUTION_OPTIONS.find((option) => option.eventType === selectedEvent);

  return (
    <>
      <Stack.Screen options={{ title: 'Resultado del trabajo' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Trabajo del punto</Text>
          <Text style={styles.title}>{Array.isArray(params.code) ? params.code[0] : params.code}</Text>
          <Text style={styles.body}>{Array.isArray(params.name) ? params.name[0] : params.name || 'Punto de control'}</Text>
          <View style={styles.currentState}><Text style={styles.stateLabel}>Estado actual</Text><StatePill label={currentPresentation.label} tone={currentPresentation.tone} /></View>
        </View>

        {isLoading && !round ? <View style={styles.card}><Text style={styles.body}>Cargando el punto...</Text></View> : null}
        {roundError ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo cargar el punto</Text><Text style={styles.body}>{roundError}</Text></View> : null}
        {accessState === 'read-only' ? <View style={styles.readOnlyCard}><MaterialIcons color="#7dd3fc" name="visibility" size={22} /><View style={styles.readOnlyCopy}><Text style={styles.readOnlyTitle}>Consulta de solo lectura</Text><Text style={styles.body}>Esta cuenta puede consultar el resultado recibido, pero no modificarlo.</Text></View></View> : null}

        {accessState === 'allowed' ? <View style={styles.card}>
          <Text style={styles.sectionTitle}>¿Qué has hecho?</Text>
          <Text style={styles.body}>Marca el resultado real del trabajo. No sustituye la lectura ni confirma una medición.</Text>
          <View style={styles.options}>
            {WORK_EXECUTION_OPTIONS.map((option) => (
              <Pressable key={option.eventType} onPress={() => { setSelectedEvent(option.eventType); setFeedback(null); }} style={[styles.option, selectedEvent === option.eventType ? styles.optionSelected : null]}>
                <MaterialIcons color={selectedEvent === option.eventType ? colors.accentGreen : colors.textSecondary} name={option.icon} size={21} />
                <Text style={[styles.optionText, selectedEvent === option.eventType ? styles.optionTextSelected : null]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          {selectedOption && requiresWorkExecutionReason(selectedOption.eventType) ? <>
            <Text style={styles.label}>Motivo obligatorio</Text>
            <Text style={styles.caption}>Elige una opción rápida o escribe otro motivo.</Text>
            <View style={styles.reasonOptions}>
              {WORK_EXECUTION_REASON_OPTIONS.map((option) => <Pressable key={option} onPress={() => { setReason(option); setFeedback(null); }} style={[styles.reasonOption, reason === option ? styles.reasonOptionSelected : null]}><Text style={[styles.reasonOptionText, reason === option ? styles.reasonOptionTextSelected : null]}>{option}</Text></Pressable>)}
            </View>
            <TextInput onChangeText={(value) => { setReason(value); setFeedback(null); }} placeholder="Otro motivo" placeholderTextColor="#64748b" style={styles.input} value={reason} />
          </> : null}
          <Text style={styles.label}>Nota para el relevo (opcional)</Text>
          <TextInput multiline onChangeText={setNotes} placeholder="Qué debe saber el supervisor o el siguiente turno" placeholderTextColor="#64748b" style={[styles.input, styles.multiline]} value={notes} />
        </View> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Historial del trabajo</Text>
          {eventsLoading ? <Text style={styles.body}>Cargando acciones recibidas...</Text> : null}
          {eventsError ? <Text style={styles.body}>{eventsError}</Text> : null}
          {!eventsLoading && !eventsError && events.length === 0 ? <Text style={styles.body}>Todavía no hay acciones recibidas para este punto.</Text> : null}
          {events.map((event) => {
            const option = WORK_EXECUTION_OPTIONS.find((item) => item.eventType === event.eventType);
            const presentation = getWorkExecutionStatePresentation(getWorkExecutionState(event));
            return <View key={event.id} style={styles.historyRow}>
              <View style={styles.historyCopy}>
                <View style={styles.historyHeader}><Text style={styles.historyTitle}>{option?.label ?? event.eventType}</Text><StatePill label={presentation.label} tone={presentation.tone} /></View>
                <Text style={styles.body}>{new Date(event.occurredAt).toLocaleString('es-ES')}</Text>
                {event.reason ? <Text style={styles.reason}>Motivo: {event.reason}</Text> : null}
                {event.notes ? <Text style={styles.body}>Nota: {event.notes}</Text> : null}
              </View>
            </View>;
          })}
        </View>

        {feedback ? <View style={styles.feedback}><MaterialIcons color={feedback.includes('servidor') ? colors.accentGreen : colors.amber} name="info" size={20} /><Text style={styles.feedbackText}>{feedback}</Text></View> : null}
        {accessState === 'allowed' && errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo guardar el resultado</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        {accessState === 'allowed' ? <Pressable disabled={isCreating} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating ? styles.disabled : null]}><MaterialIcons color={colors.background} name="save" size={19} /><Text style={styles.primaryButtonText}>{isCreating ? 'Guardando...' : 'Guardar resultado'}</Text></Pressable> : null}
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Volver al punto</Text></Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  currentState: { alignItems: 'center', flexDirection: 'row', gap: spacing[1], marginTop: spacing[1] },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, gap: spacing[1], padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800' },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  feedback: { alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.4)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], padding: spacing[3] },
  feedbackText: { color: colors.textPrimary, flex: 1, fontSize: 14, fontWeight: '800', lineHeight: 20 },
  hero: { gap: spacing[1], paddingVertical: spacing[2] },
  historyCopy: { flex: 1, gap: spacing[1] },
  historyHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing[1], justifyContent: 'space-between' },
  historyRow: { borderBottomColor: '#2a2f3a', borderBottomWidth: 1, paddingVertical: spacing[2] },
  historyTitle: { color: colors.textPrimary, flex: 1, fontSize: 15, fontWeight: '900' },
  input: { backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, color: colors.textPrimary, fontSize: typography.fontSizeBody, padding: spacing[2] },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  option: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], minHeight: 48, paddingHorizontal: spacing[2] },
  optionSelected: { borderColor: colors.accentGreen, borderWidth: 2 },
  options: { gap: spacing[1] },
  optionText: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  optionTextSelected: { color: colors.accentGreen },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, flexDirection: 'row', gap: spacing[1], justifyContent: 'center', paddingVertical: spacing[3] },
  primaryButtonText: { color: colors.background, fontSize: typography.fontSizeBody, fontWeight: '900' },
  readOnlyCard: { alignItems: 'flex-start', backgroundColor: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.45)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[2], padding: spacing[3] },
  readOnlyCopy: { flex: 1, gap: spacing[1] },
  readOnlyTitle: { color: '#7dd3fc', fontSize: typography.fontSizeBody, fontWeight: '900' },
  reason: { color: colors.textPrimary, fontSize: 14, lineHeight: 20 },
  reasonOption: { borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, paddingHorizontal: spacing[2], paddingVertical: spacing[1] },
  reasonOptionSelected: { borderColor: colors.amber, backgroundColor: 'rgba(245, 158, 11, 0.08)' },
  reasonOptionText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  reasonOptionTextSelected: { color: colors.amber },
  reasonOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, paddingVertical: spacing[2] },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '900' },
  stateLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' }
});
