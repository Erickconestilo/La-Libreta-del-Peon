import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalculatedThresholdStatus } from '@shared/types';
import { ChoiceChip, ThresholdPill } from '@/components/monitoring-ui';
import { MONITORING_INSTRUMENTS, type MonitoringInstrumentType, useCreateInstrumentReading } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

type ValueMode = 'numeric' | 'text';

export default function ReadingCaptureScreen() {
  const params = useLocalSearchParams<{ code: string; controlPointId: string; instrumentType: string; name: string; roundId: string; roundPointId: string }>();
  const roundPointId = Array.isArray(params.roundPointId) ? params.roundPointId[0] : params.roundPointId;
  const controlPointId = Array.isArray(params.controlPointId) ? params.controlPointId[0] : params.controlPointId;
  const roundId = Array.isArray(params.roundId) ? params.roundId[0] : params.roundId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const instrumentType = useMemo<MonitoringInstrumentType>(() => {
    const candidate = Array.isArray(params.instrumentType) ? params.instrumentType[0] : params.instrumentType;
    return MONITORING_INSTRUMENTS.some((item) => item.value === candidate) ? candidate as MonitoringInstrumentType : 'digital_level';
  }, [params.instrumentType]);
  const instrument = MONITORING_INSTRUMENTS.find((item) => item.value === instrumentType);
  const { errorMessage, isCreating, pendingCount, submitReading } = useCreateInstrumentReading({ controlPointId: controlPointId ?? null, roundId: roundId ?? null, roundPointId: roundPointId ?? null });
  const [mode, setMode] = useState<ValueMode>('numeric');
  const [numericValue, setNumericValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [unit, setUnit] = useState('mm');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ autoConfirmed: boolean; delta: number | null; status: CalculatedThresholdStatus; type: 'synced' | 'queued' } | null>(null);

  const handleSubmit = async () => {
    const valueNumeric = mode === 'numeric' && numericValue.trim() ? Number(numericValue.replace(',', '.')) : null;
    const valueText = mode === 'text' ? textValue.trim() : null;
    if (mode === 'numeric' && (valueNumeric === null || !Number.isFinite(valueNumeric))) {
      Alert.alert('Lectura no válida', 'Escribe un valor numérico válido.');
      return;
    }
    if (mode === 'text' && !valueText) {
      Alert.alert('Falta la lectura', 'Escribe el valor de texto que has observado.');
      return;
    }

    try {
      const result = await submitReading({
        measuredAt: new Date().toISOString(),
        notes: notes.trim() || null,
        rawPayload: null,
        unit: unit.trim() || null,
        valueNumeric,
        valueText,
      });

      if (result.mode === 'queued') {
        setFeedback({ autoConfirmed: false, delta: null, status: 'unknown', type: 'queued' });
        return;
      }

      setFeedback({
        autoConfirmed: result.response.autoConfirmed,
        delta: result.response.delta,
        status: result.response.thresholdStatus,
        type: 'synced',
      });
    } catch {
      // El error se muestra debajo del formulario.
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Registrar lectura' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled" style={styles.container}>
        <View style={styles.hero}><Text style={styles.eyebrow}>{instrument?.label ?? 'Instrumento'}</Text><Text style={styles.title}>{Array.isArray(params.code) ? params.code[0] : params.code}</Text><Text style={styles.body}>{Array.isArray(params.name) ? params.name[0] : params.name || 'Punto de control'}</Text></View>
        <View style={styles.card}>
          <Text style={styles.label}>Tipo de valor</Text>
          <View style={styles.chips}><ChoiceChip label="Número" onPress={() => setMode('numeric')} selected={mode === 'numeric'} /><ChoiceChip label="Texto" onPress={() => setMode('text')} selected={mode === 'text'} /></View>
          {mode === 'numeric' ? <><Text style={styles.label}>Lectura</Text><TextInput keyboardType="decimal-pad" onChangeText={setNumericValue} placeholder="Ej. 2,40" placeholderTextColor="#64748b" style={styles.input} value={numericValue} /></> : <><Text style={styles.label}>Lectura</Text><TextInput onChangeText={setTextValue} placeholder="Ej. estable, seco, sin acceso" placeholderTextColor="#64748b" style={styles.input} value={textValue} /></>}
          <Text style={styles.label}>Unidad</Text>
          <TextInput autoCapitalize="none" onChangeText={setUnit} placeholder="mm, m, bar..." placeholderTextColor="#64748b" style={styles.input} value={unit} />
          <Text style={styles.label}>Notas</Text>
          <TextInput multiline onChangeText={setNotes} placeholder="Condición, incidencia o referencia de medida" placeholderTextColor="#64748b" style={[styles.input, styles.notes]} value={notes} />
        </View>
        <View style={styles.offlineCard}><Text style={styles.offlineTitle}>Guardado seguro en campo</Text><Text style={styles.body}>Si no hay red, la lectura queda encolada y se enviará con el mismo identificador al recuperar conexión.</Text>{pendingCount > 0 ? <Text style={styles.pendingText}>{pendingCount} cambio{pendingCount === 1 ? '' : 's'} pendiente{pendingCount === 1 ? '' : 's'} de sincronizar</Text> : null}</View>
        {errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo guardar la lectura</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        {feedback ? <View style={[styles.feedback, feedback.type === 'queued' ? styles.feedbackPending : null]}>{feedback.type === 'queued' ? <><Text style={styles.feedbackTitle}>Lectura guardada sin conexión</Text><Text style={styles.body}>El umbral se evaluará automáticamente cuando el servidor reciba la lectura.</Text></> : <><View style={styles.feedbackHeader}><Text style={styles.feedbackTitle}>{feedback.autoConfirmed ? 'Lectura confirmada' : 'Lectura pendiente de revisión'}</Text><ThresholdPill status={feedback.status} /></View>{feedback.delta !== null ? <Text style={styles.body}>Variación respecto a la anterior: {feedback.delta}</Text> : <Text style={styles.body}>No hay variación comparable todavía.</Text>}</>}</View> : null}
        <Pressable disabled={isCreating} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating ? styles.disabled : null]}><Text style={styles.primaryButtonText}>{isCreating ? 'Guardando...' : 'Guardar lectura'}</Text></Pressable>
        {feedback ? <Pressable onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Volver a la ronda</Text></Pressable> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  chips: { flexDirection: 'row', gap: spacing[1] },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800' },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  feedback: { backgroundColor: colors.card, borderColor: colors.accentGreen, borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  feedbackHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing[1], justifyContent: 'space-between' },
  feedbackPending: { borderColor: colors.amber },
  feedbackTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '900' },
  hero: { gap: spacing[0], paddingVertical: spacing[2] },
  input: { backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, color: colors.textPrimary, fontSize: typography.fontSizeBody, padding: spacing[2] },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  offlineCard: { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.4)', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  offlineTitle: { color: colors.accentGreen, fontSize: typography.fontSizeBody, fontWeight: '900' },
  pendingText: { color: colors.amber, fontSize: 13, fontWeight: '800' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, paddingVertical: spacing[3] },
  primaryButtonText: { color: colors.background, fontSize: typography.fontSizeBody, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, paddingVertical: spacing[2] },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
});
