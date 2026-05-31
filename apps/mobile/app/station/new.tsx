import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CreateStationInput, DeviceType, StationStatus } from '@shared/types';
import { useCurrentSession } from '@/hooks/use-auth';
import { useCreateStation, useStations } from '@/hooks/use-stations';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

const STATUS_OPTIONS: Array<{ label: string; value: StationStatus }> = [
  { label: 'Activa', value: 'active' },
  { label: 'Reemplazada', value: 'replaced' },
  { label: 'Incidencia', value: 'incident' }
];

const DEVICE_OPTIONS: Array<{ label: string; value: DeviceType | null }> = [
  { label: 'Sin definir', value: null },
  { label: 'Leica', value: 'leica' },
  { label: 'Trimble', value: 'trimble' }
];

type CapturedCoordinate = {
  accuracy: number | null;
  lat: number;
  lng: number;
};

export default function NewStationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data: stations } = useStations();
  const { createStation, errorMessage, isCreating } = useCreateStation();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<StationStatus>('active');
  const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
  const [coordinate, setCoordinate] = useState<CapturedCoordinate | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const canCreateStation = currentUser?.role === 'admin' || currentUser?.role === 'topografo';

  const projectOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();

    for (const station of stations ?? []) {
      if (station.projectId && station.project?.name) {
        map.set(station.projectId, {
          id: station.projectId,
          label: station.project.name
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [stations]);

  const handleCaptureGps = async () => {
    setIsLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permiso de ubicación', 'No se puede guardar GPS si Android no concede permiso.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      setCoordinate({
        accuracy: position.coords.accuracy ?? null,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
    } catch {
      Alert.alert('GPS no disponible', 'No se pudo capturar la posición actual. Puedes crear la estación sin GPS.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Falta el nombre', 'Escribe un nombre claro para la estación.');
      return;
    }

    const input: CreateStationInput = {
      deviceType,
      displayMode: coordinate ? 'approximate' : null,
      lat: coordinate?.lat ?? null,
      lng: coordinate?.lng ?? null,
      mapStatus: coordinate ? 'approximate' : null,
      name: trimmedName,
      notes: notes.trim() ? notes.trim() : null,
      projectId,
      readings: coordinate
        ? [
            {
              accuracy: coordinate.accuracy,
              capturedOnline: true,
              lat: coordinate.lat,
              lng: coordinate.lng,
              rawPayload: {
                capturedFrom: 'mobile_create_station'
              },
              source: 'mobile_network'
            }
          ]
        : [],
      resolvedMethod: coordinate ? 'mobile_gps' : null,
      status
    };

    try {
      const station = await createStation(input);
      router.replace(`/station/${station.id}` as never);
    } catch {
      // The hook exposes a readable error card below the form.
    }
  };

  if (!canCreateStation) {
    return (
      <>
        <Stack.Screen options={{ title: 'Crear estación' }} />
        <View style={styles.centered}>
          <Text style={styles.title}>Acción restringida</Text>
          <Text style={styles.body}>Solo admin y topógrafo pueden crear estaciones.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Crear estación' }} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        style={styles.container}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Alta rápida</Text>
          <Text style={styles.heroTitle}>Nueva estación</Text>
          <Text style={styles.body}>Guarda lo mínimo útil en campo. Los datos técnicos se pueden completar después.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Ej. Estacionamiento rampa norte"
            placeholderTextColor="#64748b"
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>Obra</Text>
          <View style={styles.chipGrid}>
            <ChoiceChip label="Sin obra" selected={projectId === null} onPress={() => setProjectId(null)} />
            {projectOptions.map((project) => (
              <ChoiceChip
                key={project.id}
                label={project.label}
                selected={projectId === project.id}
                onPress={() => setProjectId(project.id)}
              />
            ))}
          </View>

          <Text style={styles.label}>Estado</Text>
          <View style={styles.chipGrid}>
            {STATUS_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                selected={status === option.value}
                onPress={() => setStatus(option.value)}
              />
            ))}
          </View>

          <Text style={styles.label}>Instrumento</Text>
          <View style={styles.chipGrid}>
            {DEVICE_OPTIONS.map((option) => (
              <ChoiceChip
                key={option.label}
                label={option.label}
                selected={deviceType === option.value}
                onPress={() => setDeviceType(option.value)}
              />
            ))}
          </View>

          <Text style={styles.label}>Notas de campo</Text>
          <TextInput
            multiline
            onChangeText={setNotes}
            placeholder="Referencia, acceso, obstáculo o memoria rápida"
            placeholderTextColor="#64748b"
            style={[styles.input, styles.notesInput]}
            value={notes}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>GPS opcional</Text>
          {coordinate ? (
            <Text style={styles.body}>
              {formatCoordinate(coordinate.lat)}, {formatCoordinate(coordinate.lng)}
              {coordinate.accuracy ? ` · precisión ${Math.round(coordinate.accuracy)} m` : ''}
            </Text>
          ) : (
            <Text style={styles.body}>Puedes crear la estación sin GPS y añadir posición o lecturas después.</Text>
          )}
          <View style={styles.actionRow}>
            <Pressable
              disabled={isLocating}
              onPress={() => void handleCaptureGps()}
              style={[styles.secondaryButton, isLocating ? styles.disabledButton : null]}
            >
              <Text style={styles.secondaryButtonText}>{isLocating ? 'Buscando...' : 'Capturar GPS'}</Text>
            </Pressable>
            {coordinate ? (
              <Pressable onPress={() => setCoordinate(null)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Quitar GPS</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No se pudo crear</Text>
            <Text style={styles.body}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable disabled={isCreating} onPress={() => void handleSubmit()} style={[styles.primaryButton, isCreating ? styles.disabledButton : null]}>
          <Text style={styles.primaryButtonText}>{isCreating ? 'Creando...' : 'Crear estación'}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function ChoiceChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceChip, selected ? styles.choiceChipSelected : null]}>
      <Text style={[styles.choiceChipText, selected ? styles.choiceChipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

const formatCoordinate = (value: number) => value.toFixed(7);

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3],
  },
  centered: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing[2],
    justifyContent: 'center',
    padding: spacing[4],
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  choiceChip: {
    borderColor: '#2a2f3a',
    borderRadius: borderRadius[0],
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  choiceChipSelected: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  choiceChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  choiceChipTextSelected: {
    color: colors.background,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing[2],
    padding: spacing[3],
  },
  disabledButton: {
    opacity: 0.55,
  },
  errorCard: {
    backgroundColor: colors.card,
    borderLeftColor: colors.red,
    borderLeftWidth: 3,
    padding: spacing[3],
  },
  errorTitle: {
    color: colors.red,
    fontSize: typography.fontSizeBody,
    fontWeight: '800',
    marginBottom: spacing[0],
  },
  eyebrow: {
    color: colors.accentGreen,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  heroCard: {
    backgroundColor: colors.card,
    borderColor: '#2a2f3a',
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing[1],
    padding: spacing[4],
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody,
    padding: spacing[2],
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 16,
    paddingVertical: spacing[3],
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.fontSizeBody,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '800',
  },
});
