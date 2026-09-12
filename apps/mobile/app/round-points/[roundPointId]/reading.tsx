import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CalculatedThresholdStatus, PotentiometerPair, PotentiometerMeasurementPayload } from '@shared/types';
import { ChoiceChip, ThresholdPill } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { MONITORING_INSTRUMENTS, type MonitoringInstrumentType, useCreateInstrumentReading, useMonitoringRound, useReadingHistory } from '@/hooks/use-monitoring';
import { canWriteProject } from '@/lib/field-access';
import { getReadingCaptureCopy } from '@/lib/monitoring-reading-form';
import {
  clearMonitoringReadingDraft,
  getMonitoringReadingDraft,
  saveMonitoringReadingDraft
} from '@/lib/offline/monitoring-reading-drafts';
import { deletePreparedPhoto, pickAndCompressPhoto, type PhotoSource, type PreparedPhoto } from '@/lib/photo-upload';
import { colors, spacing, typography } from '@/src/theme';

type ValueMode = 'numeric' | 'text';

export default function ReadingCaptureScreen() {
  const params = useLocalSearchParams<{ code: string; controlPointId: string; instrumentType: string; name: string; roundId: string; roundPointId: string }>();
  const roundPointId = Array.isArray(params.roundPointId) ? params.roundPointId[0] : params.roundPointId;
  const controlPointId = Array.isArray(params.controlPointId) ? params.controlPointId[0] : params.controlPointId;
  const roundId = Array.isArray(params.roundId) ? params.roundId[0] : params.roundId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeSessionId, currentUser } = useCurrentSession();
  const { data: round, isLoading: isRoundLoading } = useMonitoringRound(roundId ?? null);
  const instrumentType = useMemo<MonitoringInstrumentType>(() => {
    const candidate = Array.isArray(params.instrumentType) ? params.instrumentType[0] : params.instrumentType;
    return MONITORING_INSTRUMENTS.some((item) => item.value === candidate) ? candidate as MonitoringInstrumentType : 'digital_level';
  }, [params.instrumentType]);
  const instrument = MONITORING_INSTRUMENTS.find((item) => item.value === instrumentType);
  const isPhotoWitness = instrumentType === 'fissure_witness';
  const captureCopy = getReadingCaptureCopy(instrumentType);
  const canEdit = canWriteProject(currentUser, round?.projectId);
  const { data: history = [], errorMessage: historyError, isLoading: isHistoryLoading } = useReadingHistory(controlPointId ?? null, instrumentType);
  const { errorMessage, isCreating, pendingCount, submitReading } = useCreateInstrumentReading({ controlPointId: controlPointId ?? null, roundId: roundId ?? null, roundPointId: roundPointId ?? null });
  const [mode, setMode] = useState<ValueMode>('numeric');
  const [numericValue, setNumericValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [unit, setUnit] = useState('mm');
  const [notes, setNotes] = useState('');
  const [potValues, setPotValues] = useState<Record<PotentiometerPair, string>>({
    'blue-brown': '',
    'yellow-blue': '',
    'yellow-brown': ''
  });
  const [potUnit, setPotUnit] = useState('kOhm');
  const [potScale, setPotScale] = useState('');
  const [potPosition, setPotPosition] = useState('');
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [feedback, setFeedback] = useState<{ autoConfirmed: boolean; delta: number | null; photoPending: boolean; status: CalculatedThresholdStatus; type: 'synced' | 'queued' } | null>(null);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [draftPersistenceEnabled, setDraftPersistenceEnabled] = useState(true);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'restored' | 'saved'>('idle');
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsDraftReady(false);
    setDraftPersistenceEnabled(true);
    setDraftStatus('idle');

    if (!activeSessionId || !roundPointId) {
      setIsDraftReady(true);
      return;
    }

    const storedDraft = getMonitoringReadingDraft(activeSessionId, roundPointId);

    if (storedDraft) {
      setMode(storedDraft.draft.mode);
      setNumericValue(storedDraft.draft.numericValue);
      setTextValue(storedDraft.draft.textValue);
      setUnit(storedDraft.draft.unit);
      setNotes(storedDraft.draft.notes);
      setPotValues(storedDraft.draft.potValues);
      setPotUnit(storedDraft.draft.potUnit);
      setPotScale(storedDraft.draft.potScale);
      setPotPosition(storedDraft.draft.potPosition);
      setDraftStatus('restored');
    }

    setIsDraftReady(true);
  }, [activeSessionId, roundPointId]);

  useEffect(() => {
    if (!isDraftReady || !draftPersistenceEnabled || !activeSessionId || !roundPointId) {
      return;
    }

    if (draftSaveTimer.current) {
      clearTimeout(draftSaveTimer.current);
    }

    draftSaveTimer.current = setTimeout(() => {
      saveMonitoringReadingDraft(activeSessionId, roundPointId, {
        mode,
        notes,
        numericValue,
        potPosition,
        potScale,
        potUnit,
        potValues,
        textValue,
        unit
      });
      setDraftStatus('saved');
    }, 250);

    return () => {
      if (draftSaveTimer.current) {
        clearTimeout(draftSaveTimer.current);
        draftSaveTimer.current = null;
      }
    };
  }, [activeSessionId, draftPersistenceEnabled, isDraftReady, mode, notes, numericValue, potPosition, potScale, potUnit, potValues, roundPointId, textValue, unit]);

  const handlePickPhoto = async (source: PhotoSource) => {
    try {
      const pickedPhoto = await pickAndCompressPhoto(source);

      if (!pickedPhoto) {
        return;
      }

      if (photo) {
        await deletePreparedPhoto(photo);
      }

      setPhoto(pickedPhoto);
    } catch (error) {
      Alert.alert('No se pudo preparar la foto', error instanceof Error ? error.message : 'Prueba de nuevo con otra imagen.');
    }
  };

  const handleRemovePhoto = async () => {
    await deletePreparedPhoto(photo);
    setPhoto(null);
  };

  const handleSubmit = async () => {
    const valueNumeric = mode === 'numeric' && numericValue.trim() ? Number(numericValue.replace(',', '.')) : null;
    const valueText = mode === 'text' ? textValue.trim() : null;
    if (isPhotoWitness && !photo) {
      Alert.alert('Falta la evidencia', 'Para un fisurómetro testigo debes adjuntar una foto. No se pide un valor numérico.');
      return;
    }
    if (!isPhotoWitness && mode === 'numeric' && (valueNumeric === null || !Number.isFinite(valueNumeric))) {
      Alert.alert('Lectura no válida', 'Escribe un valor numérico válido.');
      return;
    }
    if (!isPhotoWitness && mode === 'text' && !valueText) {
      Alert.alert('Falta la lectura', 'Escribe el valor de texto que has observado.');
      return;
    }

    let rawPayload: Record<string, unknown> | null = isPhotoWitness
      ? { kind: 'fissure_witness', schemaVersion: 1 }
      : null;
    if (instrumentType === 'potentiometer') {
      const pairs: PotentiometerPair[] = ['yellow-blue', 'yellow-brown', 'blue-brown'];
      const components = pairs.map((pair) => ({ pair, unit: potUnit.trim(), value: Number(potValues[pair].replace(',', '.')) }));
      if (!potUnit.trim() || components.some((component) => !Number.isFinite(component.value))) {
        Alert.alert('Faltan componentes', 'Completa los tres pares del potenciómetro con valores válidos.');
        return;
      }
      const payload: PotentiometerMeasurementPayload = {
        components,
        kind: 'potentiometer',
        position: potPosition.trim() || null,
        scale: potScale.trim() || null,
        schemaVersion: 1
      };
      rawPayload = payload as unknown as Record<string, unknown>;
    }

    try {
      const result = await submitReading({
        measuredAt: new Date().toISOString(),
        notes: notes.trim() || null,
        rawPayload,
        unit: isPhotoWitness ? null : instrumentType === 'potentiometer' ? potUnit.trim() : unit.trim() || null,
        valueNumeric: instrumentType === 'potentiometer' ? null : valueNumeric,
        valueText: isPhotoWitness ? 'Evidencia fotográfica' : instrumentType === 'potentiometer' ? 'Componentes de potenciómetro' : valueText,
        photo
      });

      if (result.mode === 'queued') {
        if (activeSessionId && roundPointId) {
          clearMonitoringReadingDraft(activeSessionId, roundPointId);
        }
        setDraftPersistenceEnabled(false);
        setPhoto(null);
        setDraftStatus('idle');
        setFeedback({ autoConfirmed: false, delta: null, photoPending: result.photoPending, status: 'unknown', type: 'queued' });
        return;
      }

      if (activeSessionId && roundPointId) {
        clearMonitoringReadingDraft(activeSessionId, roundPointId);
      }
      setDraftPersistenceEnabled(false);
      setPhoto(null);
      setDraftStatus('idle');
      setFeedback({
        autoConfirmed: result.response.autoConfirmed,
        delta: result.response.delta,
        photoPending: result.photoPending,
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
        {isDraftReady && draftStatus === 'restored' ? <View style={styles.draftNotice}><Text style={styles.draftNoticeText}>Borrador recuperado de este punto. Revisa los datos antes de guardar.</Text></View> : null}
        {!isRoundLoading && !canEdit ? <View style={styles.readOnlyCard}><Text style={styles.readOnlyTitle}>Consulta supervisora</Text><Text style={styles.body}>Esta membresía permite consultar la lectura recibida por el servidor, pero no modificarla ni crear otra.</Text></View> : null}
        {!isRoundLoading && canEdit ? <View style={styles.card}>
          {isPhotoWitness ? <Text style={styles.protocolNote}>Registro fotográfico del testigo. La imagen y la fecha son la evidencia; no se inventa una medida.</Text> : <><Text style={styles.label}>Tipo de valor</Text><View style={styles.chips}><ChoiceChip label="Número" onPress={() => setMode('numeric')} selected={mode === 'numeric'} /><ChoiceChip label="Texto" onPress={() => setMode('text')} selected={mode === 'text'} /></View>{mode === 'numeric' ? <><Text style={styles.label}>Lectura</Text><TextInput keyboardType="decimal-pad" onChangeText={setNumericValue} placeholder="Ej. 2,40" placeholderTextColor="#64748b" style={styles.input} value={numericValue} /></> : <><Text style={styles.label}>Lectura</Text><TextInput onChangeText={setTextValue} placeholder="Ej. estable, seco, sin acceso" placeholderTextColor="#64748b" style={styles.input} value={textValue} /></>}</>}
          {instrumentType === 'potentiometer' ? <View style={styles.protocolBlock}>
            <Text style={styles.protocolTitle}>Componentes del potenciómetro</Text>
            {(['yellow-blue', 'yellow-brown', 'blue-brown'] as PotentiometerPair[]).map((pair) => <View key={pair}><Text style={styles.label}>{pair}</Text><TextInput keyboardType="decimal-pad" onChangeText={(value) => setPotValues((current) => ({ ...current, [pair]: value }))} placeholder="Valor observado" placeholderTextColor="#64748b" style={styles.input} value={potValues[pair]} /></View>)}
            <Text style={styles.label}>Unidad de los componentes</Text>
            <TextInput autoCapitalize="none" onChangeText={setPotUnit} placeholder="kOhm, V..." placeholderTextColor="#64748b" style={styles.input} value={potUnit} />
            <Text style={styles.label}>Escala utilizada</Text>
            <TextInput onChangeText={setPotScale} placeholder="Escala del equipo" placeholderTextColor="#64748b" style={styles.input} value={potScale} />
            <Text style={styles.label}>Posición</Text>
            <TextInput onChangeText={setPotPosition} placeholder="Posición o referencia" placeholderTextColor="#64748b" style={styles.input} value={potPosition} />
            <Text style={styles.protocolNote}>Se guardan los tres pares tal como se observan. No se convierte a desplazamiento.</Text>
          </View> : null}
          {captureCopy.showsUnit ? <><Text style={styles.label}>Unidad</Text>{instrumentType !== 'potentiometer' ? <TextInput autoCapitalize="none" onChangeText={setUnit} placeholder="mm, m, bar..." placeholderTextColor="#64748b" style={styles.input} value={unit} /> : <Text style={styles.body}>{potUnit || 'Sin unidad'}</Text>}</> : null}
          <Text style={styles.label}>Notas</Text>
          <TextInput multiline onChangeText={setNotes} placeholder="Condición, incidencia o referencia de medida" placeholderTextColor="#64748b" style={[styles.input, styles.notes]} value={notes} />
          <Text style={styles.label}>{captureCopy.photoLabel}</Text>
          <Text style={styles.caption}>{captureCopy.photoCaption}</Text>
          {photo ? <View style={styles.photoReady}><View><Text style={styles.photoReadyTitle}>Foto preparada</Text><Text style={styles.body}>Se conservará y se sincronizará junto a la lectura.</Text></View><Pressable accessibilityLabel="Quitar foto" onPress={() => void handleRemovePhoto()} style={styles.photoRemove}><Text style={styles.photoRemoveText}>Quitar</Text></Pressable></View> : <View style={styles.photoActions}><Pressable accessibilityLabel="Hacer foto" onPress={() => void handlePickPhoto('camera')} style={styles.photoAction}><Text style={styles.photoActionText}>Cámara</Text></Pressable><Pressable accessibilityLabel="Elegir foto de galería" onPress={() => void handlePickPhoto('library')} style={styles.photoAction}><Text style={styles.photoActionText}>Galería</Text></Pressable></View>}
        </View> : null}
        {canEdit ? <View style={styles.offlineCard}><Text style={styles.offlineTitle}>Guardado seguro en campo</Text><Text style={styles.body}>Si no hay red, la lectura queda encolada y se enviará con el mismo identificador al recuperar conexión.</Text>{pendingCount > 0 ? <Text style={styles.pendingText}>{pendingCount} cambio{pendingCount === 1 ? '' : 's'} pendiente{pendingCount === 1 ? '' : 's'} de sincronizar</Text> : null}</View> : null}
        {canEdit && errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo guardar la lectura</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        {canEdit && feedback ? <View style={[styles.feedback, feedback.type === 'queued' ? styles.feedbackPending : null]}>{feedback.type === 'queued' ? <><Text style={styles.feedbackTitle}>Lectura guardada sin conexión</Text><Text style={styles.body}>El umbral se evaluará automáticamente cuando el servidor reciba la lectura.</Text>{feedback.photoPending ? <Text style={styles.pendingText}>La foto también queda pendiente de sincronizar.</Text> : null}</> : <><View style={styles.feedbackHeader}><Text style={styles.feedbackTitle}>{feedback.autoConfirmed ? 'Lectura confirmada' : 'Lectura pendiente de revisión'}</Text><ThresholdPill status={feedback.status} /></View>{feedback.delta !== null ? <Text style={styles.body}>Variación respecto a la anterior: {feedback.delta}</Text> : <Text style={styles.body}>No hay variación comparable todavía.</Text>}{feedback.photoPending ? <Text style={styles.pendingText}>La lectura está guardada; la foto se enviará automáticamente al recuperar conexión.</Text> : null}</>}</View> : null}
        {canEdit ? <Pressable disabled={isCreating} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating ? styles.disabled : null]}><Text style={styles.primaryButtonText}>{isCreating ? 'Guardando...' : 'Guardar lectura'}</Text></Pressable> : null}
        {!canEdit ? <View style={styles.historySection}><Text style={styles.historyTitle}>Lecturas recibidas</Text>{isHistoryLoading ? <Text style={styles.body}>Cargando histórico...</Text> : null}{historyError ? <Text style={styles.errorText}>{historyError}</Text> : null}{!isHistoryLoading && !historyError && history.length === 0 ? <Text style={styles.body}>Todavía no hay lecturas recibidas para este punto.</Text> : null}{history.map((item) => <View key={item.id} style={styles.historyCard}><View style={styles.feedbackHeader}><Text style={styles.historyValue}>{item.valueNumeric ?? item.valueText ?? 'Sin valor'}{item.unit ? ` ${item.unit}` : ''}</Text><ThresholdPill status={item.thresholdStatus ?? 'unknown'} /></View><Text style={styles.body}>{new Date(item.measuredAt).toLocaleString('es-ES')}</Text>{item.notes ? <Text style={styles.body}>{item.notes}</Text> : null}{item.attachments?.length ? <View style={styles.attachments}><Text style={styles.attachmentLabel}>Evidencias ({item.attachments.length})</Text><View style={styles.attachmentRow}>{item.attachments.map((attachment) => <Image key={attachment.id} accessibilityLabel={attachment.title ?? 'Foto de la lectura'} source={{ uri: attachment.publicUrl }} style={styles.attachmentImage} />)}</View></View> : null}</View>)}</View> : null}
        {feedback ? <Pressable onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Volver a la ronda</Text></Pressable> : null}
        {!canEdit ? <Pressable onPress={() => router.back()} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Volver a la ronda</Text></Pressable> : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  caption: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  attachmentImage: { backgroundColor: '#111827', borderRadius: 6, height: 72, width: 72 },
  attachmentLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  attachments: { gap: spacing[1] },
  chips: { flexDirection: 'row', gap: spacing[1] },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  disabled: { opacity: 0.55 },
  draftNotice: { backgroundColor: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.45)', borderRadius: 8, borderWidth: 1, padding: spacing[2] },
  draftNoticeText: { color: '#7dd3fc', fontSize: 13, fontWeight: '800', lineHeight: 19 },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800' },
  errorText: { color: colors.red, fontSize: 13, fontWeight: '700', lineHeight: 20 },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  feedback: { backgroundColor: colors.card, borderColor: colors.accentGreen, borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  feedbackHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing[1], justifyContent: 'space-between' },
  feedbackPending: { borderColor: colors.amber },
  feedbackTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '900' },
  hero: { gap: spacing[0], paddingVertical: spacing[2] },
  historyCard: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  historySection: { gap: spacing[2] },
  historyTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '900' },
  historyValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  input: { backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, color: colors.textPrimary, fontSize: typography.fontSizeBody, padding: spacing[2] },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  offlineCard: { backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.4)', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  offlineTitle: { color: colors.accentGreen, fontSize: typography.fontSizeBody, fontWeight: '900' },
  pendingText: { color: colors.amber, fontSize: 13, fontWeight: '800' },
  protocolBlock: { borderColor: '#475569', borderRadius: 8, borderWidth: 1, gap: spacing[2], padding: spacing[2] },
  protocolNote: { color: colors.amber, fontSize: 12, lineHeight: 18 },
  protocolTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '900' },
  readOnlyCard: { backgroundColor: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.45)', borderRadius: 8, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  readOnlyTitle: { color: '#7dd3fc', fontSize: typography.fontSizeBody, fontWeight: '900' },
  photoAction: { alignItems: 'center', borderColor: '#475569', borderRadius: 8, borderWidth: 1, flex: 1, paddingVertical: spacing[2] },
  photoActionText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  photoActions: { flexDirection: 'row', gap: spacing[1] },
  photoReady: { alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.35)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: spacing[2] },
  photoReadyTitle: { color: colors.accentGreen, fontSize: 14, fontWeight: '900' },
  photoRemove: { padding: spacing[1] },
  photoRemoveText: { color: colors.red, fontSize: 13, fontWeight: '800' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, paddingVertical: spacing[3] },
  primaryButtonText: { color: colors.background, fontSize: typography.fontSizeBody, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, paddingVertical: spacing[2] },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
});
