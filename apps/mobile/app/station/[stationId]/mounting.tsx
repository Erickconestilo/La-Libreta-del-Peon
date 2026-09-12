import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { useMountingVisitMutations, useMountingVisits, MOUNTING_EVIDENCE_KINDS } from '@/hooks/use-mounting-visits';
import { useStationDetail } from '@/hooks/use-stations';
import { canWriteProject } from '@/lib/field-access';
import {
  getMountingPhotoMarkerPosition,
  MOUNTING_PHOTO_ANCHORS,
  MOUNTING_PHOTO_SIZE,
  type MountingPhotoAnchorKey
} from '@/lib/mounting-visual';
import type { MountingEvidenceKind, MountingVisitStatus } from '@shared/types';
import { colors, spacing, typography } from '@/src/theme';

const STATUS_LABELS: Record<MountingVisitStatus, string> = {
  blocked: 'No realizable',
  completed: 'Realizada',
  draft: 'En curso'
};

export default function MountingVisitsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ stationId: string }>();
  const stationId = Array.isArray(params.stationId) ? params.stationId[0] : params.stationId;
  const { currentUser } = useCurrentSession();
  const { data: station } = useStationDetail(stationId ?? null);
  const { data: visits, errorMessage: visitsError, isLoading, isOfflineCache } = useMountingVisits(stationId ?? null);
  const { createVisit, errorMessage: mutationError, isMutating, updateVisit, uploadEvidence } = useMountingVisitMutations(stationId ?? null, station?.projectId ?? null);
  const [notes, setNotes] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [title, setTitle] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [kind, setKind] = useState<MountingEvidenceKind>('general');
  const [photoAnchorKey, setPhotoAnchorKey] = useState<MountingPhotoAnchorKey | null>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const canEdit = canWriteProject(currentUser, station?.projectId);
  const selectedPhotoAnchor = MOUNTING_PHOTO_ANCHORS.find((anchor) => anchor.key === photoAnchorKey) ?? null;

  const handleCreateVisit = async () => {
    const visit = await createVisit({
      changeSummary: changeSummary.trim() || null,
      notes: notes.trim() || null,
      status: 'draft',
      visitedAt: new Date().toISOString()
    });

    setActiveVisitId(visit.id);
    setNotes('');
    setChangeSummary('');
  };

  const handleUpload = async (source: 'camera' | 'library') => {
    if (!activeVisitId) {
      return;
    }

    await uploadEvidence({
      kind,
      notes: evidenceNotes.trim() || null,
      positionX: selectedPhotoAnchor?.x ?? null,
      positionY: selectedPhotoAnchor?.y ?? null,
      source,
      title: title.trim() || null,
      visitId: activeVisitId
    });
    setTitle('');
    setEvidenceNotes('');
    setPhotoAnchorKey(null);
  };

  const handleUpdateStatus = async (visitId: string, status: MountingVisitStatus) => {
    await updateVisit({
      input: { status },
      visitId
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Visitas de montaje' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{station?.project?.name ?? 'Obra'}</Text>
          <Text style={styles.title}>{station?.name ?? 'Estación'}</Text>
          <Text style={styles.body}>Cada visita queda registrada por separado. Las fotos nuevas no sustituyen las anteriores.</Text>
        </View>

        {!canEdit ? (
          <View style={styles.readOnlyNotice}>
            <MaterialIcons color={colors.amber} name="visibility" size={18} />
            <Text style={styles.body}>Consulta de memoria de montaje. Tu cuenta no puede crear visitas ni subir evidencias.</Text>
          </View>
        ) : null}

        {visitsError ? <Text style={styles.errorText}>{visitsError}</Text> : null}
        {mutationError ? <Text style={styles.errorText}>{mutationError}</Text> : null}
        {isOfflineCache ? (
          <View style={styles.offlineNotice}>
            <MaterialIcons color={colors.amber} name="cloud-off" size={18} />
            <Text style={styles.body}>Sin conexión: mostrando la última memoria guardada en este dispositivo.</Text>
          </View>
        ) : null}

        {canEdit ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Abrir visita</Text>
            <Text style={styles.body}>Deja constancia del estado actual antes de añadir una foto de montaje o prisma.</Text>
            <TextInput
              multiline
              onChangeText={setChangeSummary}
              placeholder="Qué cambió desde la visita anterior"
              placeholderTextColor="#64748b"
              style={[styles.input, styles.multiline]}
              value={changeSummary}
            />
            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="Notas de acceso, referencias u obstáculos"
              placeholderTextColor="#64748b"
              style={[styles.input, styles.multiline]}
              value={notes}
            />
            <Pressable disabled={isMutating} onPress={() => void handleCreateVisit().catch(() => undefined)} style={[styles.primaryButton, isMutating ? styles.disabled : null]}>
              <MaterialIcons color={colors.background} name="add-a-photo" size={18} />
              <Text style={styles.primaryButtonText}>{isMutating ? 'Guardando...' : 'Guardar visita de hoy'}</Text>
            </Pressable>
          </View>
        ) : null}

        {activeVisitId && canEdit ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Añadir evidencia a la visita actual</Text>
            <Text style={styles.body}>Puedes indicar el código visible en el título. La posición relativa queda preparada para el croquis fotográfico posterior.</Text>
            <View style={styles.chips}>
              {MOUNTING_EVIDENCE_KINDS.map((option) => (
                <Pressable key={option.value} onPress={() => setKind(option.value)} style={[styles.chip, kind === option.value ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, kind === option.value ? styles.chipTextActive : null]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              onChangeText={setTitle}
              placeholder="Código o título corto"
              placeholderTextColor="#64748b"
              style={styles.input}
              value={title}
            />
            <TextInput
              multiline
              onChangeText={setEvidenceNotes}
              placeholder="Qué debe saber la siguiente persona"
              placeholderTextColor="#64748b"
              style={[styles.input, styles.multiline]}
              value={evidenceNotes}
            />
            <Text style={styles.label}>Posición relativa en la foto (opcional)</Text>
            <Text style={styles.caption}>Marca aproximadamente dónde está el código o elemento. No representa coordenadas.</Text>
            <View accessibilityLabel="Selector de posición relativa en la foto" style={styles.anchorGrid}>
              {MOUNTING_PHOTO_ANCHORS.map((anchor) => {
                const selected = anchor.key === photoAnchorKey;

                return (
                  <Pressable
                    accessibilityLabel={`Marcar ${anchor.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={anchor.key}
                    onPress={() => setPhotoAnchorKey(anchor.key)}
                    style={[styles.anchorButton, selected ? styles.anchorButtonSelected : null]}
                  >
                    <MaterialIcons color={selected ? colors.background : colors.textSecondary} name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} />
                  </Pressable>
                );
              })}
            </View>
            {selectedPhotoAnchor ? <Text style={styles.caption}>Marcador: {selectedPhotoAnchor.label}</Text> : null}
            <View style={styles.actionRow}>
              <Pressable disabled={isMutating} onPress={() => void handleUpload('camera').catch(() => undefined)} style={[styles.primaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                <MaterialIcons color={colors.background} name="photo-camera" size={18} />
                <Text style={styles.primaryButtonText}>Cámara</Text>
              </Pressable>
              <Pressable disabled={isMutating} onPress={() => void handleUpload('library').catch(() => undefined)} style={[styles.secondaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                <MaterialIcons color={colors.textPrimary} name="photo-library" size={18} />
                <Text style={styles.secondaryButtonText}>Galería</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historial de visitas</Text>
          <Text style={styles.caption}>{isLoading ? 'Cargando...' : `${visits?.length ?? 0} visita${visits?.length === 1 ? '' : 's'}`}</Text>
        </View>

        {!isLoading && !visits?.length ? (
          <View style={styles.empty}>
            <Text style={styles.sectionTitle}>Sin visitas de montaje</Text>
            <Text style={styles.body}>La primera visita aparecerá aquí sin borrar la memoria visual existente.</Text>
          </View>
        ) : null}

        {(visits ?? []).map((visit) => (
          <View key={visit.id} style={styles.card}>
            <View style={styles.visitHeader}>
              <View style={styles.visitHeaderText}>
                <Text style={styles.visitDate}>{new Date(visit.visitedAt).toLocaleString('es-ES')}</Text>
                <Text style={styles.caption}>Visita registrada por {visit.recordedBy}</Text>
              </View>
              <Text style={styles.status}>{STATUS_LABELS[visit.status]}</Text>
            </View>
            {visit.changeSummary ? <Text style={styles.body}><Text style={styles.bold}>Cambio:</Text> {visit.changeSummary}</Text> : null}
            {visit.notes ? <Text style={styles.body}>{visit.notes}</Text> : null}
            {visit.evidence.map((evidence) => (
              <View key={evidence.id} style={styles.evidence}>
                <View style={styles.evidenceImageFrame}>
                  <Image accessibilityLabel={evidence.title ?? 'Evidencia de montaje'} source={{ uri: evidence.localUri ?? evidence.publicUrl }} style={styles.evidenceImage} />
                  {evidence.positionX !== null && evidence.positionY !== null ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.evidenceMarker,
                        getMountingPhotoMarkerPosition(evidence.positionX, evidence.positionY, MOUNTING_PHOTO_SIZE)
                      ]}
                    >
                      <Text numberOfLines={1} style={styles.evidenceMarkerText}>{evidence.title ?? 'Punto'}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.evidenceBody}>
                  <Text style={styles.evidenceTitle}>{evidence.title ?? 'Evidencia sin título'}</Text>
                  <Text style={styles.caption}>{evidence.kind === 'prism' ? 'Prisma' : evidence.kind === 'reference' ? 'Referencia' : evidence.kind === 'access' ? 'Acceso' : 'General'}</Text>
                  {evidence.notes ? <Text style={styles.body}>{evidence.notes}</Text> : null}
                </View>
              </View>
            ))}
            {canEdit && visit.status === 'draft' ? (
              <View style={styles.actionRow}>
                <Pressable disabled={isMutating} onPress={() => void handleUpdateStatus(visit.id, 'completed').catch(() => undefined)} style={[styles.primaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                  <MaterialIcons color={colors.background} name="done" size={18} />
                  <Text style={styles.primaryButtonText}>Marcar realizada</Text>
                </Pressable>
                <Pressable disabled={isMutating} onPress={() => void handleUpdateStatus(visit.id, 'blocked').catch(() => undefined)} style={[styles.secondaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                  <MaterialIcons color={colors.textPrimary} name="block" size={18} />
                  <Text style={styles.secondaryButtonText}>No realizable</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: spacing[2] },
  anchorButton: { alignItems: 'center', backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 8, borderWidth: 1, height: 42, justifyContent: 'center', width: '31%' },
  anchorButtonSelected: { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
  anchorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], justifyContent: 'space-between' },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
  bold: { color: colors.textPrimary, fontWeight: '800' },
  caption: { color: colors.textSecondary, fontSize: 12 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 16, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  chip: { borderColor: '#2a2f3a', borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { backgroundColor: '#12251c', borderColor: colors.accentGreen },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: colors.accentGreen },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  disabled: { opacity: 0.55 },
  empty: { alignItems: 'center', gap: spacing[1], paddingVertical: spacing[4] },
  errorText: { color: colors.red, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  evidence: { borderColor: '#2a2f3a', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: spacing[2], overflow: 'hidden' },
  evidenceBody: { flex: 1, gap: 4, paddingVertical: spacing[2], paddingRight: spacing[2] },
  evidenceImageFrame: { height: MOUNTING_PHOTO_SIZE, overflow: 'hidden', position: 'relative', width: MOUNTING_PHOTO_SIZE },
  evidenceImage: { backgroundColor: '#0f1117', height: 104, width: 104 },
  evidenceMarker: { alignItems: 'center', backgroundColor: '#FACC15', borderColor: '#111827', borderRadius: 6, borderWidth: 1, height: 24, justifyContent: 'center', maxWidth: 72, minWidth: 24, paddingHorizontal: 4, position: 'absolute' },
  evidenceMarkerText: { color: '#111827', fontSize: 10, fontWeight: '900' },
  evidenceTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  hero: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 18, borderWidth: 1, gap: spacing[1], padding: spacing[3] },
  input: { backgroundColor: '#151922', borderColor: '#2a2f3a', borderRadius: 10, borderWidth: 1, color: colors.textPrimary, padding: 12 },
  label: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  offlineNotice: { alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], padding: spacing[2] },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accentGreen, borderRadius: 10, flexDirection: 'row', gap: spacing[1], justifyContent: 'center', paddingVertical: 12 },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: '900' },
  readOnlyNotice: { alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], padding: spacing[2] },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing[1], justifyContent: 'center', paddingVertical: 12 },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing[2] },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '900' },
  status: { backgroundColor: 'rgba(34, 197, 94, 0.16)', borderRadius: 999, color: colors.accentGreen, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  title: { color: colors.textPrimary, fontSize: 25, fontWeight: '900' },
  visitDate: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  visitHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[2], justifyContent: 'space-between' },
  visitHeaderText: { flex: 1, gap: 4 }
});
