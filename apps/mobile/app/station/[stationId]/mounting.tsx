import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { useMountingVisitMutations, useMountingVisits, MOUNTING_EVIDENCE_KINDS } from '@/hooks/use-mounting-visits';
import { useStationPrisms } from '@/hooks/use-prisms';
import { useStationDetail } from '@/hooks/use-stations';
import { canWriteProject } from '@/lib/field-access';
import {
  getMountingPhotoMarkerPosition,
  MOUNTING_PHOTO_ANCHORS,
  MOUNTING_PHOTO_SIZE,
  MOUNTING_VISUAL_FILTERS,
  filterMountingVisitsForVisual,
  getMountingEvidenceUri,
  filterMountingVisitsForStatus,
  buildMountingBlockedNotes,
  getMountingVisitStatusPresentation,
  MOUNTING_STATUS_FILTERS,
  type MountingVisualEvidence,
  type MountingVisualFilter,
  type MountingVisitStatusFilter,
  type MountingPhotoAnchorKey
} from '@/lib/mounting-visual';
import type { MountingEvidenceKind, MountingVisitStatus } from '@shared/types';
import { colors, spacing, typography } from '@/src/theme';

export default function MountingVisitsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ stationId: string }>();
  const stationId = Array.isArray(params.stationId) ? params.stationId[0] : params.stationId;
  const { currentUser } = useCurrentSession();
  const { data: station } = useStationDetail(stationId ?? null);
  const { data: prismData } = useStationPrisms(stationId ?? null);
  const { data: visits, errorMessage: visitsError, isLoading, isOfflineCache } = useMountingVisits(stationId ?? null);
  const { createVisit, errorMessage: mutationError, isMutating, updateVisit, uploadEvidence } = useMountingVisitMutations(stationId ?? null, station?.projectId ?? null);
  const [notes, setNotes] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [title, setTitle] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [kind, setKind] = useState<MountingEvidenceKind>('general');
  const [selectedPrismId, setSelectedPrismId] = useState<string | null>(null);
  const [photoAnchorKey, setPhotoAnchorKey] = useState<MountingPhotoAnchorKey | null>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [previewEvidence, setPreviewEvidence] = useState<MountingVisualEvidence | null>(null);
  const [visualFilter, setVisualFilter] = useState<MountingVisualFilter>('all');
  const [statusFilter, setStatusFilter] = useState<MountingVisitStatusFilter>('all');
  const [blockedVisitId, setBlockedVisitId] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState('');
  const canEdit = canWriteProject(currentUser, station?.projectId);
  const selectedPhotoAnchor = MOUNTING_PHOTO_ANCHORS.find((anchor) => anchor.key === photoAnchorKey) ?? null;
  const visibleVisits = useMemo(() => {
    const evidenceFiltered = filterMountingVisitsForVisual(visits ?? [], visualFilter);
    return filterMountingVisitsForStatus(evidenceFiltered, statusFilter);
  }, [visits, visualFilter, statusFilter]);

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
      prismId: kind === 'prism' ? selectedPrismId : null,
      source,
      title: title.trim() || null,
      visitId: activeVisitId
    });
    setTitle('');
    setEvidenceNotes('');
    setPhotoAnchorKey(null);
    setSelectedPrismId(null);
  };

  const handleUpdateStatus = async (visitId: string, status: MountingVisitStatus, visitNotes: string | null = null) => {
    const input = status === 'blocked'
      ? { notes: buildMountingBlockedNotes(visitNotes, blockedReason), status }
      : { status };

    if (status === 'blocked' && !blockedReason.trim()) {
      Alert.alert('Falta el motivo', 'Indica por qué no se pudo realizar esta visita antes de guardarla.');
      return;
    }

    await updateVisit({ input, visitId });
    if (status === 'blocked') {
      setBlockedVisitId(null);
      setBlockedReason('');
    }
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
            {kind === 'prism' ? (
              <View style={styles.prismPicker}>
                <Text style={styles.label}>Prisma relacionado (opcional)</Text>
                <View style={styles.chips}>
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedPrismId === null }} onPress={() => setSelectedPrismId(null)} style={[styles.chip, selectedPrismId === null ? styles.chipActive : null]}>
                    <Text style={[styles.chipText, selectedPrismId === null ? styles.chipTextActive : null]}>Sin vincular</Text>
                  </Pressable>
                  {(prismData?.prisms ?? []).map((prism) => (
                    <Pressable accessibilityLabel={`Vincular prisma ${prism.code}`} accessibilityRole="button" accessibilityState={{ selected: selectedPrismId === prism.id }} key={prism.id} onPress={() => setSelectedPrismId(prism.id)} style={[styles.chip, selectedPrismId === prism.id ? styles.chipActive : null]}>
                      <Text style={[styles.chipText, selectedPrismId === prism.id ? styles.chipTextActive : null]}>{prism.code}</Text>
                    </Pressable>
                  ))}
                </View>
                {!prismData?.prisms.length ? <Text style={styles.caption}>No hay prismas cargados para vincular; puedes conservar el código en el título.</Text> : null}
              </View>
            ) : null}
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
          <View style={styles.sectionHeaderCopy}>
            <Text style={styles.sectionTitle}>Croquis fotográfico</Text>
            <Text style={styles.caption}>Memoria visual acumulada, sin coordenadas ni orientación métrica.</Text>
          </View>
          <Text style={styles.caption}>{isLoading ? 'Cargando...' : `${visibleVisits.length} visita${visibleVisits.length === 1 ? '' : 's'}`}</Text>
        </View>

        <View accessibilityLabel="Filtrar memoria visual" style={styles.chips}>
          {MOUNTING_VISUAL_FILTERS.map((filter) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: visualFilter === filter.key }}
              key={filter.key}
              onPress={() => setVisualFilter(filter.key)}
              style={[styles.chip, visualFilter === filter.key ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, visualFilter === filter.key ? styles.chipTextActive : null]}>{filter.label}</Text>
            </Pressable>
          ))}
        </View>
        <View accessibilityLabel="Filtrar estado de visitas" style={styles.chips}>
          {MOUNTING_STATUS_FILTERS.map((filter) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === filter.key }}
              key={filter.key}
              onPress={() => setStatusFilter(filter.key)}
              style={[styles.chip, statusFilter === filter.key ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, statusFilter === filter.key ? styles.chipTextActive : null]}>{filter.label}</Text>
            </Pressable>
          ))}
        </View>

        {!isLoading && !visibleVisits.length ? (
          <View style={styles.empty}>
            <Text style={styles.sectionTitle}>{visits?.length ? 'Sin evidencias de este tipo' : 'Sin visitas de montaje'}</Text>
            <Text style={styles.body}>{visits?.length ? 'Prueba otro filtro para ver la memoria completa.' : 'La primera visita aparecerá aquí sin borrar la memoria visual existente.'}</Text>
          </View>
        ) : null}

        {visibleVisits.map((visit) => {
          const statusPresentation = getMountingVisitStatusPresentation(visit.status);
          const statusStyle = statusPresentation.tone === 'danger'
            ? styles.statusDanger
            : statusPresentation.tone === 'warning'
              ? styles.statusWarning
              : styles.statusSuccess;

          return (
            <View key={visit.id} style={styles.card}>
              <View style={styles.visitHeader}>
                <View style={styles.visitHeaderText}>
                  <Text style={styles.visitDate}>{new Date(visit.visitedAt).toLocaleString('es-ES')}</Text>
                  <Text style={styles.caption}>Visita registrada por {visit.recordedBy}</Text>
                </View>
                <Text style={[styles.status, statusStyle]}>{statusPresentation.label}</Text>
              </View>
              {visit.changeSummary ? <Text style={styles.body}><Text style={styles.bold}>Cambio:</Text> {visit.changeSummary}</Text> : null}
              {visit.notes ? <Text style={styles.body}>{visit.notes}</Text> : null}
              {visit.evidence.map((evidence) => (
                <Pressable
                  accessibilityLabel={`Ampliar ${evidence.title ?? 'evidencia de montaje'}`}
                  accessibilityRole="button"
                  key={evidence.id}
                  onPress={() => setPreviewEvidence(evidence)}
                  style={styles.evidence}
                >
                  <View style={styles.evidenceImageFrame}>
                    <Image accessibilityLabel={evidence.title ?? 'Evidencia de montaje'} resizeMode="cover" source={{ uri: getMountingEvidenceUri(evidence) }} style={styles.evidenceImage} />
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
                </Pressable>
              ))}
              {canEdit && visit.status === 'draft' ? (
                <View style={styles.actionRow}>
                  <Pressable disabled={isMutating} onPress={() => void handleUpdateStatus(visit.id, 'completed').catch(() => undefined)} style={[styles.primaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                    <MaterialIcons color={colors.background} name="done" size={18} />
                    <Text style={styles.primaryButtonText}>Marcar realizada</Text>
                  </Pressable>
                  <Pressable disabled={isMutating} onPress={() => { setBlockedVisitId(visit.id); setBlockedReason(''); }} style={[styles.secondaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                    <MaterialIcons color={colors.textPrimary} name="block" size={18} />
                    <Text style={styles.secondaryButtonText}>No realizable</Text>
                  </Pressable>
                </View>
              ) : null}
              {canEdit && visit.status === 'draft' && blockedVisitId === visit.id ? (
                <View style={styles.blockedReasonBox}>
                  <Text style={styles.label}>Motivo obligatorio</Text>
                  <TextInput
                    multiline
                    onChangeText={setBlockedReason}
                    placeholder="Sin acceso, sin visibilidad, equipo dañado..."
                    placeholderTextColor="#64748b"
                    style={[styles.input, styles.multiline]}
                    value={blockedReason}
                  />
                  <View style={styles.actionRow}>
                    <Pressable disabled={isMutating} onPress={() => void handleUpdateStatus(visit.id, 'blocked', visit.notes).catch(() => undefined)} style={[styles.primaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                      <MaterialIcons color={colors.background} name="save" size={18} />
                      <Text style={styles.primaryButtonText}>Guardar motivo</Text>
                    </Pressable>
                    <Pressable disabled={isMutating} onPress={() => { setBlockedVisitId(null); setBlockedReason(''); }} style={[styles.secondaryButton, styles.actionButton, isMutating ? styles.disabled : null]}>
                      <MaterialIcons color={colors.textPrimary} name="close" size={18} />
                      <Text style={styles.secondaryButtonText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <Modal animationType="fade" onRequestClose={() => setPreviewEvidence(null)} transparent visible={Boolean(previewEvidence)}>
        <View style={[styles.previewBackdrop, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderCopy}>
              <Text numberOfLines={1} style={styles.previewTitle}>{previewEvidence?.title ?? 'Evidencia de montaje'}</Text>
              <Text style={styles.previewCaption}>Vista ampliada · posición orientativa</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar vista ampliada" accessibilityRole="button" onPress={() => setPreviewEvidence(null)} style={styles.closeButton}>
              <MaterialIcons color={colors.textPrimary} name="close" size={24} />
            </Pressable>
          </View>
          {previewEvidence ? <Image accessibilityLabel={previewEvidence.title ?? 'Evidencia de montaje ampliada'} resizeMode="contain" source={{ uri: getMountingEvidenceUri(previewEvidence) }} style={styles.previewImage} /> : null}
          {previewEvidence?.notes ? <Text style={styles.previewNotes}>{previewEvidence.notes}</Text> : null}
        </View>
      </Modal>
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
  blockedReasonBox: { backgroundColor: '#151922', borderColor: 'rgba(248, 113, 113, 0.35)', borderRadius: 10, borderWidth: 1, gap: spacing[1], padding: spacing[2] },
  bold: { color: colors.textPrimary, fontWeight: '800' },
  caption: { color: colors.textSecondary, fontSize: 12 },
  card: { backgroundColor: colors.card, borderColor: '#2a2f3a', borderRadius: 16, borderWidth: 1, gap: spacing[2], padding: spacing[3] },
  chip: { borderColor: '#2a2f3a', borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  chipActive: { backgroundColor: '#12251c', borderColor: colors.accentGreen },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: colors.accentGreen },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  closeButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 10, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  container: { backgroundColor: colors.background, flex: 1 },
  content: { gap: spacing[2], padding: spacing[3] },
  disabled: { opacity: 0.55 },
  empty: { alignItems: 'center', gap: spacing[1], paddingVertical: spacing[4] },
  errorText: { color: colors.red, fontSize: 14, lineHeight: 20 },
  eyebrow: { color: colors.accentGreen, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  evidence: { borderColor: '#2a2f3a', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: spacing[2], overflow: 'hidden' },
  evidenceBody: { flex: 1, gap: 4, paddingVertical: spacing[2], paddingRight: spacing[2] },
  evidenceImageFrame: { height: MOUNTING_PHOTO_SIZE, overflow: 'hidden', position: 'relative', width: MOUNTING_PHOTO_SIZE },
  evidenceImage: { backgroundColor: '#0f1117', height: MOUNTING_PHOTO_SIZE, width: MOUNTING_PHOTO_SIZE },
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
  prismPicker: { gap: spacing[1] },
  previewBackdrop: { backgroundColor: 'rgba(7, 9, 13, 0.98)', flex: 1, gap: spacing[2], paddingHorizontal: spacing[3] },
  previewCaption: { color: colors.textSecondary, fontSize: 12 },
  previewHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing[2], justifyContent: 'space-between' },
  previewHeaderCopy: { flex: 1, gap: 3 },
  previewImage: { flex: 1, width: '100%' },
  previewNotes: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, paddingBottom: spacing[2] },
  previewTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  readOnlyNotice: { alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: spacing[1], padding: spacing[2] },
  secondaryButton: { alignItems: 'center', borderColor: '#2a2f3a', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: spacing[1], justifyContent: 'center', paddingVertical: 12 },
  secondaryButtonText: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  sectionHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[2], justifyContent: 'space-between', paddingTop: spacing[2] },
  sectionHeaderCopy: { flex: 1, gap: 3 },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.fontSizeBody, fontWeight: '900' },
  status: { borderRadius: 999, fontSize: 11, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  statusDanger: { backgroundColor: 'rgba(248, 113, 113, 0.16)', color: colors.red },
  statusSuccess: { backgroundColor: 'rgba(34, 197, 94, 0.16)', color: colors.accentGreen },
  statusWarning: { backgroundColor: 'rgba(245, 158, 11, 0.16)', color: colors.amber },
  title: { color: colors.textPrimary, fontSize: 25, fontWeight: '900' },
  visitDate: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  visitHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing[2], justifyContent: 'space-between' },
  visitHeaderText: { flex: 1, gap: 4 }
});
