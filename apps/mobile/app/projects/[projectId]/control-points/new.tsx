import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ControlPointEnvironment, ControlPointSide } from '@shared/types';
import { ChoiceChip } from '@/components/monitoring-ui';
import { useCurrentSession } from '@/hooks/use-auth';
import { useCreateControlPoint } from '@/hooks/use-monitoring';
import { colors, spacing, typography } from '@/src/theme';

const ENVIRONMENTS: Array<{ label: string; value: ControlPointEnvironment }> = [
  { label: 'Superficie', value: 'surface' },
  { label: 'Túnel', value: 'tunnel' },
  { label: 'Otro', value: 'other' },
];

const SIDES: Array<{ label: string; value: ControlPointSide | null }> = [
  { label: 'Sin indicar', value: null },
  { label: 'Izquierda', value: 'left' },
  { label: 'Eje', value: 'axis' },
  { label: 'Derecha', value: 'right' },
  { label: 'Clave', value: 'crown' },
  { label: 'Contrabóveda', value: 'invert' },
  { label: 'Otro', value: 'other' },
];

export default function NewControlPointScreen() {
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { createControlPoint, errorMessage, isCreating } = useCreateControlPoint(projectId ?? null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<ControlPointEnvironment>('surface');
  const [pk, setPk] = useState('');
  const [tramo, setTramo] = useState('');
  const [zona, setZona] = useState('');
  const [seccion, setSeccion] = useState('');
  const [side, setSide] = useState<ControlPointSide | null>(null);
  const [notes, setNotes] = useState('');
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'topografo';

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Falta el código', 'El código identifica el punto en la libreta y en el instrumento.');
      return;
    }

    try {
      const point = await createControlPoint({
        code: code.trim(),
        environment,
        name: name.trim() || null,
        notes: notes.trim() || null,
        pk: pk.trim() || null,
        seccion: seccion.trim() || null,
        side,
        tramo: tramo.trim() || null,
        zona: zona.trim() || null,
      });
      router.replace({ pathname: '/control-points/[controlPointId]', params: { controlPointId: point.id, code: point.code, name: point.name ?? '', projectId: projectId ?? '' } } as never);
    } catch {
      // El error se muestra debajo del formulario.
    }
  };

  if (!canEdit) {
    return <View style={styles.restricted}><Text style={styles.title}>Acción restringida</Text><Text style={styles.body}>Solo admin y topógrafo pueden crear puntos.</Text></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo punto' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} keyboardShouldPersistTaps="handled" style={styles.container}>
        <View style={styles.hero}><Text style={styles.eyebrow}>Referencia de campo</Text><Text style={styles.title}>Nuevo punto</Text><Text style={styles.body}>Escribe lo que ayude a localizarlo y repetir la lectura sin ambigüedad.</Text></View>
        <View style={styles.card}>
          <Text style={styles.label}>Código</Text>
          <TextInput autoCapitalize="characters" autoCorrect={false} onChangeText={setCode} placeholder="Ej. PZ-014" placeholderTextColor="#64748b" style={styles.input} value={code} />
          <Text style={styles.label}>Nombre</Text>
          <TextInput onChangeText={setName} placeholder="Opcional" placeholderTextColor="#64748b" style={styles.input} value={name} />
          <Text style={styles.label}>Entorno</Text>
          <View style={styles.chips}>{ENVIRONMENTS.map((item) => <ChoiceChip key={item.value} label={item.label} onPress={() => setEnvironment(item.value)} selected={environment === item.value} />)}</View>
          <Text style={styles.label}>Lado</Text>
          <View style={styles.chips}>{SIDES.map((item) => <ChoiceChip key={item.label} label={item.label} onPress={() => setSide(item.value)} selected={side === item.value} />)}</View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ubicación opcional</Text>
          <Text style={styles.label}>PK</Text>
          <TextInput onChangeText={setPk} placeholder="Ej. 12+340" placeholderTextColor="#64748b" style={styles.input} value={pk} />
          <Text style={styles.label}>Tramo</Text>
          <TextInput onChangeText={setTramo} placeholder="Ej. Acceso norte" placeholderTextColor="#64748b" style={styles.input} value={tramo} />
          <Text style={styles.label}>Zona</Text>
          <TextInput onChangeText={setZona} placeholder="Ej. Itinerario 1" placeholderTextColor="#64748b" style={styles.input} value={zona} />
          <Text style={styles.label}>Sección</Text>
          <TextInput onChangeText={setSeccion} placeholder="Ej. S-12" placeholderTextColor="#64748b" style={styles.input} value={seccion} />
          <Text style={styles.label}>Notas</Text>
          <TextInput multiline onChangeText={setNotes} placeholder="Acceso, referencia o condición visible" placeholderTextColor="#64748b" style={[styles.input, styles.notes]} value={notes} />
        </View>
        {errorMessage ? <View style={styles.error}><Text style={styles.errorTitle}>No se pudo crear el punto</Text><Text style={styles.body}>{errorMessage}</Text></View> : null}
        <Pressable disabled={isCreating} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating ? styles.disabled : null]}><Text style={styles.primaryButtonText}>{isCreating ? 'Creando...' : 'Crear punto'}</Text></Pressable>
      </ScrollView>
    </>
  );
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
  notes: { minHeight: 96, textAlignVertical: 'top' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 8, paddingVertical: spacing[3] },
  primaryButtonText: { color: colors.background, fontSize: typography.fontSizeBody, fontWeight: '900' },
  restricted: { alignItems: 'center', backgroundColor: colors.background, flex: 1, gap: spacing[2], justifyContent: 'center', padding: spacing[4] },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.fontSizeTitle, fontWeight: '900' },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
});
