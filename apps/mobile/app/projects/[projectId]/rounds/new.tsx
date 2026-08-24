import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FieldConditions, MonitoringRoundStatus } from '@shared/types';
import { ChoiceChip } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useCreateMonitoringRound } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

const FIELD_CONDITIONS: Array<{ label: string; value: FieldConditions | null }> = [
  { label: 'Sin indicar', value: null },
  { label: 'Buenas', value: 'good' },
  { label: 'Regulares', value: 'regular' },
  { label: 'Adversas', value: 'adverse' },
];

const ROUND_STATUSES: Array<{ label: string; value: MonitoringRoundStatus }> = [
  { label: 'Borrador', value: 'draft' },
  { label: 'Activa', value: 'active' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function NewMonitoringRoundScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { createRound, errorMessage, isCreating } = useCreateMonitoringRound(projectId ?? null);
  const [name, setName] = useState('');
  const [roundDate, setRoundDate] = useState(today);
  const [instrumentSerial, setInstrumentSerial] = useState('');
  const [fieldConditions, setFieldConditions] = useState<FieldConditions | null>(null);
  const [status, setStatus] = useState<MonitoringRoundStatus>('draft');
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'topografo';

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Describe la campaña para reconocerla en campo.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(roundDate)) {
      Alert.alert('Fecha no válida', 'Usa el formato AAAA-MM-DD.');
      return;
    }

    try {
      const round = await createRound({
        fieldConditions,
        instrumentSerial: instrumentSerial.trim() || null,
        name: name.trim(),
        operatorId: currentUser?.role === 'topografo' ? currentUser.id : null,
        executionOrder: 0,
        roundDate,
        status,
      });
      router.replace(`/rounds/${round.id}` as never);
    } catch {
      // El error se muestra debajo del formulario.
    }
  };

  if (!canEdit) {
    return <RestrictedScreen />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nueva ronda' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled" style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Preparación</Text>
          <Text style={styles.title}>Nueva ronda</Text>
          <Text style={styles.body}>La ronda reúne los puntos y el contexto de una pasada de auscultación.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput onChangeText={setName} placeholder="Ej. Itinerario norte - mañana" placeholderTextColor="#64748b" style={styles.input} value={name} />
          <Text style={styles.label}>Fecha</Text>
          <TextInput autoCapitalize="none" keyboardType="numbers-and-punctuation" onChangeText={setRoundDate} placeholder="AAAA-MM-DD" placeholderTextColor="#64748b" style={styles.input} value={roundDate} />
          <Text style={styles.label}>Serie de instrumento</Text>
          <TextInput onChangeText={setInstrumentSerial} placeholder="Opcional" placeholderTextColor="#64748b" style={styles.input} value={instrumentSerial} />
          <Text style={styles.label}>Condiciones de campo</Text>
          <View style={styles.chips}>{FIELD_CONDITIONS.map((item) => <ChoiceChip key={item.label} label={item.label} onPress={() => setFieldConditions(item.value)} selected={fieldConditions === item.value} />)}</View>
          <Text style={styles.label}>Estado inicial</Text>
          <View style={styles.chips}>{ROUND_STATUSES.map((item) => <ChoiceChip key={item.value} label={item.label} onPress={() => setStatus(item.value)} selected={status === item.value} />)}</View>
        </View>
        {errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo crear la ronda</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        <Pressable disabled={isCreating} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating ? styles.disabled : null]}><Text style={styles.primaryButtonText}>{isCreating ? 'Creando...' : 'Crear ronda'}</Text></Pressable>
      </ScrollView>
    </>
  );
}

function RestrictedScreen() {
  return <View style={styles.restricted}><Text style={styles.title}>Acción restringida</Text><Text style={styles.body}>Solo admin y topógrafo pueden crear rondas.</Text></View>;
}

const styles = StyleSheet.create({
  body: { color: colors.textSecondary, fontSize: typography.fontSizeBody - 1, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: colors.card, borderLeftColor: colors.red, borderLeftWidth: 3, padding: spacing[3] },
  errorTitle: { color: colors.red, fontSize: typography.fontSizeBody, fontWeight: '800' },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  hero: { gap: spacing[1], paddingVertical: spacing[2] },
  input: { backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, color: colors.textPrimary, fontSize: typography.fontSizeBody, padding: spacing[2] },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, paddingVertical: spacing[3] },
  primaryButtonText: { color: colors.background, fontSize: typography.fontSizeBody, fontWeight: '900' },
  restricted: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing[2], justifyContent: 'center', padding: spacing[4] },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
});
