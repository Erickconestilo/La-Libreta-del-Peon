import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StationPhoto, StationPhotoKind } from '@shared/types';
import { PrismSketch, type PrismSketchItem } from '@/components/prism-sketch';
import { useCurrentSession } from '@/hooks/use-auth';
import { useCreateIncident, useStationIncidents } from '@/hooks/use-incidents';
import {
  type StationPrismListItem,
  type StationPrismObservation,
  usePrismPhotoMutations,
  useStationPrisms
} from '@/hooks/use-prisms';
import { useCreateStationMessage, useStationMessages } from '@/hooks/use-station-messages';
import { useStationDetail, useUpdateStationNotes } from '@/hooks/use-stations';
import {
  useStationPhotoGalleryMutations,
  useStationPhotos
} from '@/hooks/use-station-photos';
import { useStationPhotoMutations } from '@/hooks/use-station-photo';
import {
  clearPendingStationVisualPhoto,
  getPendingStationVisualPhoto,
  setPendingStationVisualPhoto
} from '@/lib/pending-station-visual-photo';
import { pickAndCompressPhoto, recoverPendingImagePickerPhoto } from '@/lib/photo-upload';
import { getStationDisplayName } from '@/lib/station-display';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

const PHOTO_KINDS: Array<{ label: string; value: StationPhotoKind }> = [
  { label: 'General', value: 'general' },
  { label: 'Punto', value: 'point' },
  { label: 'Referencia', value: 'reference' },
  { label: 'Acceso', value: 'access' },
  { label: 'Obstáculo', value: 'obstacle' },
  { label: 'Otro', value: 'other' }
];

let activeInlineCameraUploadStationId: string | null = null;

export default function StationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const params = useLocalSearchParams<{ stationId: string }>();
  const stationId = Array.isArray(params.stationId) ? params.stationId[0] : params.stationId;
  const canUseTeamTools = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const { data, errorMessage, isLoading } = useStationDetail(stationId ?? null);
  const {
    errorMessage: notesErrorMessage,
    isUpdating: isUpdatingNotes,
    updateNotes
  } = useUpdateStationNotes(stationId ?? null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [visualPhotoKind, setVisualPhotoKind] = useState<StationPhotoKind>('general');
  const [visualPhotoNotes, setVisualPhotoNotes] = useState('');
  const [visualPhotoTitle, setVisualPhotoTitle] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [provisionalName, setProvisionalName] = useState('');
  const [provisionalNotes, setProvisionalNotes] = useState('');
  const [showProvisionalForm, setShowProvisionalForm] = useState(false);
  const [setAsPrimary, setSetAsPrimary] = useState(false);
  const {
    errorMessage: photoErrorMessage,
    isMutating: isPhotoMutating,
    removeStationPhoto,
    uploadStationPhoto
  } = useStationPhotoMutations(stationId ?? null);
  const {
    data: stationPhotos,
    errorMessage: stationPhotosErrorMessage,
    isLoading: isStationPhotosLoading
  } = useStationPhotos(stationId ?? null);
  const {
    addStationPhoto,
    deleteStationPhoto,
    errorMessage: stationPhotoMutationErrorMessage,
    isMutating: isStationPhotoMutating,
    resumePendingStationPhoto
  } = useStationPhotoGalleryMutations(stationId ?? null);
  const {
    data: prismData,
    errorMessage: prismErrorMessage,
    isLoading: isPrismLoading,
  } = useStationPrisms(stationId ?? null);
  const {
    data: stationMessages,
    errorMessage: stationMessagesErrorMessage,
    isLoading: isStationMessagesLoading
  } = useStationMessages(canUseTeamTools ? stationId ?? null : null);
  const {
    createMessage,
    errorMessage: createMessageErrorMessage,
    isCreating: isCreatingMessage
  } = useCreateStationMessage(canUseTeamTools ? stationId ?? null : null);
  const {
    data: stationIncidents,
    errorMessage: stationIncidentsErrorMessage,
    isLoading: isStationIncidentsLoading
  } = useStationIncidents(canUseTeamTools ? stationId ?? null : null);
  const {
    createIncident,
    errorMessage: createIncidentErrorMessage,
    isCreating: isCreatingIncident
  } = useCreateIncident(canUseTeamTools ? stationId ?? null : null);
  const {
    errorMessage: prismPhotoErrorMessage,
    isMutating: isPrismPhotoMutating,
    removePrismPhoto,
    uploadPrismPhoto
  } = usePrismPhotoMutations(stationId ?? null);
  const coverageGroupCode = getCoverageGroupCode(prismData?.prisms);
  const prisms = prismData?.prisms ?? [];
  const prismSketchItems = useMemo(
    () => buildPrismSketchItems(prisms, prismData?.observations ?? []),
    [prisms, prismData?.observations]
  );
  const [selectedPrismCode, setSelectedPrismCode] = useState<string | null>(null);
  const selectedPrismSketchItem = prismSketchItems.find((item) => item.code === selectedPrismCode) ?? null;
  const provisionalStationIncidents = useMemo(() => {
    return (stationIncidents ?? []).filter((incident) => incident.suggestion?.kind === 'new_station');
  }, [stationIncidents]);
  const canEditPhotos = canUseTeamTools;
  const canEditStation = canUseTeamTools;
  const canViewTechnical = canUseTeamTools;
  const [showTechnicalData, setShowTechnicalData] = useState(false);
  const isRecoveringPendingVisualPhotoRef = useRef(false);

  useEffect(() => {
    setNotesDraft(data?.notes ?? '');
  }, [data?.notes]);

  useEffect(() => {
    if (prismSketchItems.length === 0) {
      setSelectedPrismCode(null);
      return;
    }

    if (!selectedPrismCode || !prismSketchItems.some((item) => item.code === selectedPrismCode)) {
      setSelectedPrismCode(prismSketchItems[0].code);
    }
  }, [prismSketchItems, selectedPrismCode]);

  useEffect(() => {
    if (
      !stationId ||
      !canEditPhotos ||
      isRecoveringPendingVisualPhotoRef.current ||
      activeInlineCameraUploadStationId === stationId
    ) {
      return;
    }

    let cancelled = false;

    const recoverPendingVisualPhoto = async () => {
      const pendingVisualPhoto = await getPendingStationVisualPhoto();

      if (!pendingVisualPhoto || pendingVisualPhoto.stationId !== stationId || pendingVisualPhoto.source !== 'camera') {
        return;
      }

      isRecoveringPendingVisualPhotoRef.current = true;

      try {
        const preparedPhoto = await recoverPendingImagePickerPhoto();

        if (!preparedPhoto) {
          await clearPendingStationVisualPhoto();
          return;
        }

        const photo = await resumePendingStationPhoto({
          input: {
            isPrimary: pendingVisualPhoto.isPrimary,
            kind: pendingVisualPhoto.kind,
            notes: pendingVisualPhoto.notes,
            title: pendingVisualPhoto.title
          },
          preparedPhoto
        });

        if (cancelled) {
          return;
        }

        if (photo) {
          setVisualPhotoNotes('');
          setVisualPhotoTitle('');
          setSetAsPrimary(false);
        }

        await clearPendingStationVisualPhoto();
      } catch {
        if (!cancelled) {
          await clearPendingStationVisualPhoto();
        }
      } finally {
        isRecoveringPendingVisualPhotoRef.current = false;
      }
    };

    void recoverPendingVisualPhoto();

    return () => {
      cancelled = true;
    };
  }, [canEditPhotos, resumePendingStationPhoto, stationId]);

  const handleAddVisualPhoto = (source: 'camera' | 'library') => {
    if (!stationId) {
      return;
    }

    const input = {
      isPrimary: setAsPrimary,
      kind: visualPhotoKind,
      notes: visualPhotoNotes.trim() ? visualPhotoNotes.trim() : null,
      source,
      title: visualPhotoTitle.trim() ? visualPhotoTitle.trim() : null
    } as const;

    const pendingContext = {
      isPrimary: input.isPrimary,
      kind: input.kind,
      notes: input.notes,
      returnPath: `/station/${stationId}`,
      source: input.source,
      stationId,
      title: input.title
    };

    void (async () => {
      if (source === 'library') {
        return addStationPhoto(input);
      }

      activeInlineCameraUploadStationId = stationId;
      await setPendingStationVisualPhoto(pendingContext);

      const preparedPhoto = await pickAndCompressPhoto('camera');

      if (!preparedPhoto) {
        await clearPendingStationVisualPhoto();
        return null;
      }

      return resumePendingStationPhoto({
        input: {
          isPrimary: input.isPrimary,
          kind: input.kind,
          notes: input.notes,
          title: input.title
        },
        preparedPhoto
      });
    })()
      .then((photo) => {
        if (photo) {
          setVisualPhotoNotes('');
          setVisualPhotoTitle('');
          setSetAsPrimary(false);
        }
      })
      .finally(() => {
        if (source === 'camera') {
          activeInlineCameraUploadStationId = null;
          void clearPendingStationVisualPhoto();
        }
      })
      .catch(() => undefined);
  };

  const handleDeleteVisualPhoto = (photo: StationPhoto) => {
    Alert.alert('Borrar foto de memoria', 'Se quitará de la memoria visual de esta estación.', [
      {
        style: 'cancel',
        text: 'Cancelar'
      },
      {
        onPress: () => {
          void deleteStationPhoto(photo.id).catch(() => undefined);
        },
        style: 'destructive',
        text: 'Borrar'
      }
    ]);
  };

  const handleUploadPhoto = () => {
    Alert.alert('Añadir foto', 'Elige el origen de la imagen. Se comprimirá antes de subirla.', [
      {
        onPress: () => {
          void uploadStationPhoto('camera').catch(() => undefined);
        },
        text: 'Cámara'
      },
      {
        onPress: () => {
          void uploadStationPhoto('library').catch(() => undefined);
        },
        text: 'Galería'
      },
      {
        style: 'cancel',
        text: 'Cancelar'
      }
    ]);
  };

  const handleRemovePhoto = () => {
    Alert.alert('Quitar foto', 'La foto dejará de estar asociada a esta estación. El archivo puede permanecer en Storage.', [
      {
        style: 'cancel',
        text: 'Cancelar'
      },
      {
        onPress: () => {
          void removeStationPhoto().catch(() => undefined);
        },
        style: 'destructive',
        text: 'Quitar'
      }
    ]);
  };

  const handleSaveNotes = () => {
    void updateNotes({
      notes: notesDraft.trim() ? notesDraft.trim() : null
    })
      .then(() => setIsEditingNotes(false))
      .catch(() => undefined);
  };

  const handleCreateMessage = () => {
    const body = messageDraft.trim();

    if (!body) {
      return;
    }

    void createMessage({ body })
      .then(() => setMessageDraft(''))
      .catch(() => undefined);
  };

  const handleCreateProvisionalStation = () => {
    if (!data) {
      return;
    }

    const proposedStationName = provisionalName.trim() || `Provisional ${getStationDisplayName(data)}`;
    const notes = provisionalNotes.trim() || null;

    void createIncident({
      description: notes
        ? `Propuesta de estacionamiento provisional: ${notes}`
        : 'Propuesta de estacionamiento provisional.',
      stationId: data.id,
      suggestion: {
        kind: 'new_station',
        notes,
        proposedLat: typeof data.lat === 'number' ? data.lat : null,
        proposedLng: typeof data.lng === 'number' ? data.lng : null,
        proposedPrismCode: null,
        proposedStationName
      },
      type: 'obstaculo_estacionamiento'
    })
      .then(() => {
        setProvisionalName('');
        setProvisionalNotes('');
        setShowProvisionalForm(false);
      })
      .catch(() => undefined);
  };

  const handleUploadPrismPhoto = (prismId: string) => {
    Alert.alert('Foto de prisma', 'Elige el origen de la imagen. Se comprimirá antes de subirla.', [
      {
        onPress: () => {
          void uploadPrismPhoto(prismId, 'camera').catch(() => undefined);
        },
        text: 'Cámara'
      },
      {
        onPress: () => {
          void uploadPrismPhoto(prismId, 'library').catch(() => undefined);
        },
        text: 'Galería'
      },
      {
        style: 'cancel',
        text: 'Cancelar'
      }
    ]);
  };

  const handleRemovePrismPhoto = (prismId: string) => {
    Alert.alert('Quitar foto de prisma', 'La ficha del prisma quedará sin imagen asociada.', [
      {
        style: 'cancel',
        text: 'Cancelar'
      },
      {
        onPress: () => {
          void removePrismPhoto(prismId).catch(() => undefined);
        },
        style: 'destructive',
        text: 'Quitar'
      }
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: data ? getStationDisplayName(data) : 'Detalle de estación' }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]} style={styles.container}>
        {isLoading ? (
          <View style={styles.card}>
            <Text style={styles.title}>Cargando detalle</Text>
            <Text style={styles.body}>Preparando estación, lecturas y posición resuelta.</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.card}>
            <Text style={styles.title}>No se pudo cargar la estación</Text>
            <Text style={styles.body}>{errorMessage}</Text>
          </View>
        ) : null}

        {data ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.eyebrow}>{data.project?.name ?? 'Sin obra asignada'}</Text>
              <Text style={styles.heroTitle}>{getStationDisplayName(data)}</Text>
              <Text style={styles.body}>
                Instrumento: {data.deviceType ?? 'sin definir'} · Estado mapa: {data.mapStatus ?? 'sin definir'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Foto de campo</Text>
              {data.photoUrl ? (
                <Image source={{ uri: data.photoUrl }} style={styles.stationPhoto} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderTitle}>Sin foto</Text>
                  <Text style={styles.body}>Añade una imagen comprimida para identificar la estación en obra.</Text>
                </View>
              )}

              {photoErrorMessage ? <Text style={styles.errorText}>{photoErrorMessage}</Text> : null}

              {canEditPhotos ? (
                <View style={styles.photoActions}>
                  <Pressable
                    disabled={isPhotoMutating}
                    onPress={handleUploadPhoto}
                    style={[styles.linkButton, isPhotoMutating ? styles.disabledButton : null]}
                  >
                    <Text style={styles.linkButtonText}>
                      {isPhotoMutating ? 'Procesando...' : data.photoUrl ? 'Cambiar foto' : 'Añadir foto'}
                    </Text>
                  </Pressable>

                  {data.photoUrl ? (
                    <Pressable
                      disabled={isPhotoMutating}
                      onPress={handleRemovePhoto}
                      style={[styles.secondaryButton, isPhotoMutating ? styles.disabledButton : null]}
                    >
                      <Text style={styles.secondaryButtonText}>Quitar foto</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.caption}>Solo admin y topógrafo pueden cambiar fotos.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Memoria visual del estacionamiento</Text>
              <Text style={styles.body}>
                Galería para recordar punto, referencias cercanas, accesos, obstáculos y detalles útiles en obra.
              </Text>

              {stationPhotosErrorMessage ? <Text style={styles.errorText}>{stationPhotosErrorMessage}</Text> : null}
              {stationPhotoMutationErrorMessage ? <Text style={styles.errorText}>{stationPhotoMutationErrorMessage}</Text> : null}

              {isStationPhotosLoading ? <Text style={styles.body}>Cargando memoria visual...</Text> : null}

              {(stationPhotos ?? []).length === 0 && !isStationPhotosLoading ? (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderTitle}>Sin memoria visual</Text>
                  <Text style={styles.body}>Añade fotos para que otro topógrafo entienda rápido el estacionamiento.</Text>
                </View>
              ) : null}

              {(stationPhotos ?? []).map((photo) => (
                <View key={photo.id} style={styles.visualPhotoCard}>
                  <Image source={{ uri: photo.publicUrl }} style={styles.visualPhotoImage} />
                  <View style={styles.visualPhotoBody}>
                    <View style={styles.visualPhotoHeader}>
                      <Text style={styles.visualPhotoKind}>{getPhotoKindLabel(photo.kind)}</Text>
                      {photo.isPrimary ? <Text style={styles.primaryBadge}>Principal</Text> : null}
                    </View>
                    <Text style={styles.readingTitle}>{photo.title ?? 'Foto sin título'}</Text>
                    {photo.notes ? <Text style={styles.body}>{photo.notes}</Text> : null}
                    <Text style={styles.caption}>Subida: {formatDate(photo.uploadedAt)}</Text>
                    {canEditPhotos ? (
                      <Pressable
                        disabled={isStationPhotoMutating}
                        onPress={() => handleDeleteVisualPhoto(photo)}
                        style={styles.dangerButton}
                      >
                        <Text style={styles.dangerButtonText}>Borrar de memoria</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}

              {canEditPhotos ? (
                <View style={styles.visualPhotoForm}>
                  <Text style={styles.readingTitle}>Añadir foto a memoria</Text>
                  <View style={styles.kindGrid}>
                    {PHOTO_KINDS.map((kind) => (
                      <Pressable
                        key={kind.value}
                        onPress={() => setVisualPhotoKind(kind.value)}
                        style={[
                          styles.kindChip,
                          visualPhotoKind === kind.value ? styles.kindChipActive : null
                        ]}
                      >
                        <Text
                          style={[
                            styles.kindChipText,
                            visualPhotoKind === kind.value ? styles.kindChipTextActive : null
                          ]}
                        >
                          {kind.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    onChangeText={setVisualPhotoTitle}
                    placeholder="Título corto, ej. acceso por valla norte"
                    placeholderTextColor="#64748b"
                    style={styles.input}
                    value={visualPhotoTitle}
                  />
                  <TextInput
                    multiline
                    onChangeText={setVisualPhotoNotes}
                    placeholder="Nota para el siguiente topógrafo"
                    placeholderTextColor="#64748b"
                    style={[styles.input, styles.notesInput]}
                    value={visualPhotoNotes}
                  />
                  <Pressable
                    onPress={() => setSetAsPrimary((current) => !current)}
                    style={[styles.secondaryButton, setAsPrimary ? styles.secondaryButtonActive : null]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {setAsPrimary ? 'Será foto principal' : 'Marcar también como foto principal'}
                    </Text>
                  </Pressable>
                  <View style={styles.photoSourceRow}>
                    <Pressable
                      disabled={isStationPhotoMutating}
                      onPress={() => handleAddVisualPhoto('camera')}
                      style={[styles.linkButton, styles.photoSourceButton, isStationPhotoMutating ? styles.disabledButton : null]}
                    >
                      <Text style={styles.linkButtonText}>{isStationPhotoMutating ? 'Subiendo...' : 'Cámara'}</Text>
                    </Pressable>
                    <Pressable
                      disabled={isStationPhotoMutating}
                      onPress={() => handleAddVisualPhoto('library')}
                      style={[styles.linkButton, styles.photoSourceButton, isStationPhotoMutating ? styles.disabledButton : null]}
                    >
                      <Text style={styles.linkButtonText}>Galería</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Text style={styles.caption}>Solo admin y topógrafo pueden añadir memoria visual.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Notas</Text>
              {notesErrorMessage ? <Text style={styles.errorText}>{notesErrorMessage}</Text> : null}
              {isEditingNotes ? (
                <>
                  <TextInput
                    multiline
                    onChangeText={setNotesDraft}
                    placeholder="Escribe una nota útil para campo"
                    placeholderTextColor="#64748b"
                    style={[styles.input, styles.notesInput]}
                    value={notesDraft}
                  />
                  <View style={styles.notesActionRow}>
                    <Pressable
                      disabled={isUpdatingNotes}
                      onPress={handleSaveNotes}
                      style={[styles.linkButton, styles.notesActionButton, isUpdatingNotes ? styles.disabledButton : null]}
                    >
                      <Text style={styles.linkButtonText}>{isUpdatingNotes ? 'Guardando...' : 'Guardar nota'}</Text>
                    </Pressable>
                    <Pressable
                      disabled={isUpdatingNotes}
                      onPress={() => {
                        setNotesDraft(data.notes ?? '');
                        setIsEditingNotes(false);
                      }}
                      style={[styles.secondaryButton, styles.notesActionButton, isUpdatingNotes ? styles.disabledButton : null]}
                    >
                      <Text style={styles.secondaryButtonText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.body}>{data.notes ?? 'Sin notas todavía.'}</Text>
                  {canEditStation ? (
                    <Pressable onPress={() => setIsEditingNotes(true)} style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>{data.notes ? 'Editar notas' : 'Añadir notas'}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.caption}>Estás en modo visitante. Para añadir notas o fotos, entra con un token de topógrafo/admin en Perfil.</Text>
                  )}
                </>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Mensajes del equipo</Text>
              <Text style={styles.body}>
                Bitácora corta para dejar avisos a la siguiente persona que visite este estacionamiento.
              </Text>

              {stationMessagesErrorMessage ? <Text style={styles.errorText}>{stationMessagesErrorMessage}</Text> : null}
              {createMessageErrorMessage ? <Text style={styles.errorText}>{createMessageErrorMessage}</Text> : null}
              {isStationMessagesLoading ? <Text style={styles.body}>Cargando mensajes...</Text> : null}

              {(stationMessages ?? []).length === 0 && !isStationMessagesLoading && canUseTeamTools ? (
                <Text style={styles.caption}>Todavía no hay mensajes para este estacionamiento.</Text>
              ) : null}

              {canUseTeamTools ? (stationMessages ?? []).slice(0, 5).map((message) => (
                <View key={message.id} style={styles.messageCard}>
                  <Text style={styles.body}>{message.body}</Text>
                  <Text style={styles.messageMeta}>
                    {formatUserLabel(message.createdByUser)} · {formatDate(message.createdAt)}
                  </Text>
                </View>
              )) : null}

              {canEditStation ? (
                <View style={styles.messageForm}>
                  <TextInput
                    multiline
                    onChangeText={setMessageDraft}
                    placeholder="Ej. Prisma PN2 tapado por material, revisar mañana"
                    placeholderTextColor="#64748b"
                    style={[styles.input, styles.notesInput]}
                    value={messageDraft}
                  />
                  <Pressable
                    disabled={isCreatingMessage || !messageDraft.trim()}
                    onPress={handleCreateMessage}
                    style={[
                      styles.linkButton,
                      isCreatingMessage || !messageDraft.trim() ? styles.disabledButton : null
                    ]}
                  >
                    <Text style={styles.linkButtonText}>{isCreatingMessage ? 'Guardando...' : 'Dejar mensaje'}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.caption}>Mensajes internos solo visibles con token de topógrafo/admin.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Estacionamientos provisionales</Text>
              <Text style={styles.body}>
                Si este punto no sirve en campo, registra una propuesta provisional ligada a esta estación. Puede haber ninguna, una o varias.
              </Text>

              {stationIncidentsErrorMessage ? <Text style={styles.errorText}>{stationIncidentsErrorMessage}</Text> : null}
              {createIncidentErrorMessage ? <Text style={styles.errorText}>{createIncidentErrorMessage}</Text> : null}
              {isStationIncidentsLoading ? <Text style={styles.body}>Cargando propuestas...</Text> : null}

              {provisionalStationIncidents.length === 0 && !isStationIncidentsLoading && canUseTeamTools ? (
                <Text style={styles.caption}>No hay propuestas provisionales abiertas.</Text>
              ) : null}

              {canUseTeamTools ? provisionalStationIncidents.map((incident) => (
                <View key={incident.id} style={styles.provisionalCard}>
                  <View style={styles.prismHeader}>
                    <Text style={styles.readingTitle}>{incident.suggestion?.proposedStationName ?? 'Provisional sin nombre'}</Text>
                    <Text style={[styles.statusTag, styles.statusTagAmber]}>Abierta</Text>
                  </View>
                  {incident.suggestion?.notes ? <Text style={styles.body}>{incident.suggestion.notes}</Text> : null}
                  <Text style={styles.caption}>Registrada: {formatDate(incident.reportedAt)}</Text>
                </View>
              )) : null}

              {canEditStation ? (
                showProvisionalForm ? (
                  <View style={styles.messageForm}>
                    <TextInput
                      onChangeText={setProvisionalName}
                      placeholder="Nombre, ej. Provisional rampa norte"
                      placeholderTextColor="#64748b"
                      style={styles.input}
                      value={provisionalName}
                    />
                    <TextInput
                      multiline
                      onChangeText={setProvisionalNotes}
                      placeholder="Motivo y cómo llegar al punto provisional"
                      placeholderTextColor="#64748b"
                      style={[styles.input, styles.notesInput]}
                      value={provisionalNotes}
                    />
                    <View style={styles.notesActionRow}>
                      <Pressable
                        disabled={isCreatingIncident}
                        onPress={handleCreateProvisionalStation}
                        style={[styles.linkButton, styles.notesActionButton, isCreatingIncident ? styles.disabledButton : null]}
                      >
                        <Text style={styles.linkButtonText}>{isCreatingIncident ? 'Guardando...' : 'Guardar propuesta'}</Text>
                      </Pressable>
                      <Pressable
                        disabled={isCreatingIncident}
                        onPress={() => setShowProvisionalForm(false)}
                        style={[styles.secondaryButton, styles.notesActionButton]}
                      >
                        <Text style={styles.secondaryButtonText}>Cancelar</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => setShowProvisionalForm(true)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Proponer estacionamiento provisional</Text>
                  </Pressable>
                )
              ) : (
                <Text style={styles.caption}>Propuestas internas solo visibles con token de topógrafo/admin.</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ubicación de campo</Text>
              {typeof data.lat === 'number' && typeof data.lng === 'number' ? (
                <Text style={styles.body}>
                  {formatCoordinate(data.lat)}, {formatCoordinate(data.lng)}
                </Text>
              ) : (
                <Text style={styles.body}>Sin coordenadas visibles todavía.</Text>
              )}
              <Text style={styles.caption}>Los detalles técnicos quedan separados para no saturar la consulta rápida.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Croquis de prismas</Text>
              <Text style={styles.body}>
                Vista operativa por ángulo y distancia desde esta estación. No es coordenada geográfica absoluta.
              </Text>

              {prismPhotoErrorMessage ? <Text style={styles.errorText}>{prismPhotoErrorMessage}</Text> : null}

              {isPrismLoading ? (
                <Text style={styles.body}>Cargando croquis de prismas...</Text>
              ) : prismErrorMessage ? (
                <Text style={styles.body}>{prismErrorMessage}</Text>
              ) : (
                <>
                  <PrismSketch
                    items={prismSketchItems}
                    onSelect={setSelectedPrismCode}
                    selectedCode={selectedPrismCode}
                  />
                  <View style={styles.prismSketchLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.legendDotGreen]} />
                      <Text style={styles.caption}>Activo</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.legendDotAmber]} />
                      <Text style={styles.caption}>Reemplazado</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, styles.legendDotRed]} />
                      <Text style={styles.caption}>No visible</Text>
                    </View>
                  </View>
                </>
              )}

              {selectedPrismSketchItem ? (
                <View style={styles.prismDetailCard}>
                  <View style={styles.prismHeader}>
                    <View>
                      <Text style={styles.prismCode}>{selectedPrismSketchItem.code}</Text>
                      <Text style={styles.caption}>Toca otro punto del croquis para cambiar de prisma.</Text>
                    </View>
                    <Text style={[styles.statusTag, getStatusTagStyle(selectedPrismSketchItem.status)]}>
                      {formatStatus(selectedPrismSketchItem.status)}
                    </Text>
                  </View>

                  {selectedPrismSketchItem.photoUrl ? (
                    <Image source={{ uri: selectedPrismSketchItem.photoUrl }} style={styles.prismPhoto} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderTitle}>Sin foto de prisma</Text>
                      <Text style={styles.body}>Añade una imagen para reconocerlo rápido en campo.</Text>
                    </View>
                  )}

                  <View style={styles.summaryRow}>
                    <SummaryChip label="Distancia" value={`${formatMeters(selectedPrismSketchItem.distanceM)} m`} />
                    <SummaryChip label="Ángulo H" value={`${formatAngle(selectedPrismSketchItem.angleDeg)}°`} />
                  </View>
                  <Text style={styles.body}>
                    Observaciones: {selectedPrismSketchItem.observationCount} · Última: {formatDate(selectedPrismSketchItem.lastObservedAt)}
                  </Text>
                  <Text style={styles.body}>
                    Constante prisma: {selectedPrismSketchItem.prismConstant ?? '—'}
                  </Text>
                  {selectedPrismSketchItem.notes ? (
                    <Text style={styles.body}>{selectedPrismSketchItem.notes}</Text>
                  ) : null}

                  {canEditPhotos ? (
                    <View style={styles.photoActions}>
                      <Pressable
                        disabled={isPrismPhotoMutating}
                        onPress={() => handleUploadPrismPhoto(selectedPrismSketchItem.prismId)}
                        style={[styles.linkButton, isPrismPhotoMutating ? styles.disabledButton : null]}
                      >
                        <Text style={styles.linkButtonText}>
                          {isPrismPhotoMutating
                            ? 'Procesando...'
                            : selectedPrismSketchItem.photoUrl
                              ? 'Cambiar foto del prisma'
                              : 'Añadir foto del prisma'}
                        </Text>
                      </Pressable>
                      {selectedPrismSketchItem.photoUrl ? (
                        <Pressable
                          disabled={isPrismPhotoMutating}
                          onPress={() => handleRemovePrismPhoto(selectedPrismSketchItem.prismId)}
                          style={[styles.secondaryButton, isPrismPhotoMutating ? styles.disabledButton : null]}
                        >
                          <Text style={styles.secondaryButtonText}>Quitar foto del prisma</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.caption}>Solo admin y topógrafo pueden cambiar fotos de prismas.</Text>
                  )}
                </View>
              ) : null}
            </View>

            {canViewTechnical ? (
              <View style={styles.card}>
                <Pressable
                  onPress={() => setShowTechnicalData((current) => !current)}
                  style={styles.technicalHeader}
                >
                  <View style={styles.technicalHeaderText}>
                    <Text style={styles.sectionTitle}>Datos técnicos</Text>
                    <Text style={styles.caption}>Posición completa, prismas y lecturas asociadas.</Text>
                  </View>
                  <Text style={styles.technicalToggleText}>{showTechnicalData ? 'Ocultar' : 'Mostrar'}</Text>
                </Pressable>

                {showTechnicalData ? (
                  <>
                    <View style={styles.technicalBlock}>
                      <Text style={styles.readingTitle}>Posición resuelta</Text>
                      <Text style={styles.body}>Lat: {data.lat ?? '—'}</Text>
                      <Text style={styles.body}>Lng: {data.lng ?? '—'}</Text>
                      <Text style={styles.body}>UTM zona: {data.utmZone ?? '—'}</Text>
                      <Text style={styles.body}>UTM E: {data.utmEasting ?? '—'}</Text>
                      <Text style={styles.body}>UTM N: {data.utmNorthing ?? '—'}</Text>
                      <Text style={styles.body}>Método: {data.resolvedMethod ?? '—'}</Text>
                      <Text style={styles.body}>Display mode: {data.displayMode ?? '—'}</Text>
                    </View>

                    <View style={styles.technicalBlock}>
                      <Text style={styles.readingTitle}>Prismas visibles</Text>
                      {isPrismLoading ? (
                        <Text style={styles.body}>Cargando prismas y observaciones...</Text>
                      ) : null}

                      {prismErrorMessage ? (
                        <Text style={styles.body}>{prismErrorMessage}</Text>
                      ) : null}

                      {!isPrismLoading && !prismErrorMessage ? (
                        <>
                          <View style={styles.summaryRow}>
                            <SummaryChip
                              label="Prismas visibles"
                              value={String(prisms.length)}
                            />
                            <SummaryChip
                              label="Serie"
                              value={coverageGroupCode ?? '—'}
                            />
                          </View>

                          {prisms.length === 0 ? (
                            <Text style={styles.body}>Todavía no hay prismas asociados a esta estación.</Text>
                          ) : (
                            prisms.slice(0, 6).map((prism) => (
                              <View key={prism.id} style={styles.readingRow}>
                                <View style={styles.prismHeader}>
                                  <Text style={styles.readingTitle}>{prism.code}</Text>
                                  <Text style={[styles.statusTag, getStatusTagStyle(prism.status)]}>
                                    {formatStatus(prism.status)}
                                  </Text>
                                </View>
                                <Text style={styles.body}>
                                  {prism.observationCount} observación{prism.observationCount !== 1 ? 'es' : ''}
                                </Text>
                                <Text style={styles.body}>
                                  Última observación: {formatDate(prism.stationLastObservedAt)}
                                </Text>
                              </View>
                            ))
                          )}

                          {prisms.length > 6 ? (
                            <Text style={styles.caption}>
                              Mostrando 6 de {prisms.length} prismas para mantener lectura rápida en campo.
                            </Text>
                          ) : null}
                        </>
                      ) : null}
                    </View>

                    {coverageGroupCode ? (
                      <View style={styles.technicalBlock}>
                        <Text style={styles.readingTitle}>Cobertura por serie</Text>
                        <Text style={styles.body}>
                          Esta estación forma parte de la serie {coverageGroupCode}. La cobertura completa se consulta en una vista separada para no saturar el detalle.
                        </Text>
                        <Pressable
                          onPress={() =>
                            router.push(
                              {
                                params: { groupCode: coverageGroupCode },
                                pathname: '/prisms/coverage/[groupCode]',
                              } as never,
                            )
                          }
                          style={styles.linkButton}
                        >
                          <Text style={styles.linkButtonText}>Ver cobertura completa</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    <View style={styles.technicalBlock}>
                      <Text style={styles.readingTitle}>Lecturas asociadas</Text>
                      {data.readings.length === 0 ? (
                        <Text style={styles.body}>Esta estación aún no tiene lecturas guardadas.</Text>
                      ) : (
                        data.readings.map((reading) => (
                          <View key={reading.id} style={styles.readingRow}>
                            <Text style={styles.readingTitle}>
                              {reading.source} · {reading.capturedOnline ? 'con conexión' : 'sin conexión'}
                            </Text>
                            <Text style={styles.body}>
                              {reading.lat}, {reading.lng}
                            </Text>
                            <Text style={styles.body}>Precisión: {reading.accuracy ?? '—'}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

type SummaryChipProps = {
  label: string;
  value: string;
};

type StationPrismSketchItem = PrismSketchItem & {
  lastObservedAt: string | null;
  notes: string | null;
  observationCount: number;
  prismConstant: number | null;
  prismId: string;
};

function SummaryChip({ label, value }: SummaryChipProps) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const buildPrismSketchItems = (
  prisms: StationPrismListItem[],
  observations: StationPrismObservation[]
): StationPrismSketchItem[] => {
  const prismsByCode = new Map(prisms.map((prism) => [prism.code, prism]));
  const latestObservationByPrismCode = new Map<string, StationPrismObservation>();

  for (const observation of observations) {
    if (
      !isFiniteNumber(observation.horizontalAngle) ||
      !isFiniteNumber(observation.slopeDistance) ||
      observation.slopeDistance <= 0
    ) {
      continue;
    }

    const current = latestObservationByPrismCode.get(observation.prismCode);

    if (!current || getObservationTimestamp(observation) >= getObservationTimestamp(current)) {
      latestObservationByPrismCode.set(observation.prismCode, observation);
    }
  }

  return Array.from(latestObservationByPrismCode.entries())
    .flatMap(([prismCode, observation]) => {
      const prism = prismsByCode.get(prismCode);

      if (!prism || !isFiniteNumber(observation.horizontalAngle) || !isFiniteNumber(observation.slopeDistance)) {
        return [];
      }

      const item: StationPrismSketchItem = {
        angleDeg: observation.horizontalAngle,
        code: prism.code,
        distanceM: observation.slopeDistance,
        lastObservedAt: prism.stationLastObservedAt,
        notes: prism.notes,
        observationCount: prism.observationCount,
        photoUrl: prism.photoUrl,
        prismConstant: prism.prismConstant,
        prismId: prism.id,
        status: prism.status
      };

      return [item];
    })
    .sort((a, b) => a.code.localeCompare(b.code, 'es', { numeric: true }));
};

const getObservationTimestamp = (observation: StationPrismObservation) => {
  const value = observation.measuredAt ?? observation.createdAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const getCoverageGroupCode = (
  prisms: Array<{ monitoringMetadata: Record<string, unknown> }> | undefined,
) => {
  if (!prisms || prisms.length === 0) {
    return null;
  }

  for (const prism of prisms) {
    const groupCode = prism.monitoringMetadata?.groupCode;

    if (typeof groupCode === 'string' && groupCode.trim().length > 0) {
      return groupCode.trim();
    }
  }

  return null;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const formatCoordinate = (value: number) => value.toFixed(7);

const formatAngle = (value: number) => value.toFixed(2);

const formatMeters = (value: number) => value.toFixed(value >= 100 ? 0 : 1);

const formatStatus = (status: string) => {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'inactive':
      return 'Inactivo';
    case 'missing':
      return 'No visible';
    case 'replaced':
      return 'Reemplazado';
    default:
      return status;
  }
};

const getStatusTagStyle = (status: string) => {
  switch (status) {
    case 'active':
      return styles.statusTagGreen;
    case 'missing':
      return styles.statusTagAmber;
    case 'replaced':
      return styles.statusTagAmber;
    case 'inactive':
      return styles.statusTagMuted;
    default:
      return styles.statusTagMuted;
  }
};

const getPhotoKindLabel = (kind: StationPhotoKind) => {
  return PHOTO_KINDS.find((item) => item.value === kind)?.label ?? kind;
};

const formatUserLabel = (
  user: {
    email: string;
    fullName: string;
    role: string;
  } | null
) => {
  if (!user) {
    return 'Equipo';
  }

  return user.fullName || user.email;
};

const styles = StyleSheet.create({
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
    gap: 8,
    padding: 18,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 28,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  disabledButton: {
    opacity: 0.6,
  },
  eyebrow: {
    color: colors.amber,
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
    gap: 8,
    padding: 20,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  prismHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prismCode: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  prismDetailCard: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing[2],
    padding: spacing[3],
  },
  prismPhoto: {
    backgroundColor: '#0f1117',
    borderRadius: 16,
    height: 180,
    width: '100%',
  },
  prismSketchLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  readingRow: {
    borderTopColor: '#2a2f3a',
    borderTopWidth: 1,
    gap: 4,
    paddingTop: 10,
  },
  readingTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 12,
  },
  linkButtonText: {
    color: colors.background,
    fontSize: typography.fontSizeBody,
    fontWeight: '700',
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 20,
  },
  dangerButton: {
    alignItems: 'center',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    paddingVertical: 10,
  },
  dangerButtonText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    padding: 12,
  },
  messageCard: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  messageForm: {
    borderTopColor: '#2a2f3a',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  messageMeta: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  kindChip: {
    borderColor: '#2a2f3a',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  kindChipActive: {
    backgroundColor: '#12251c',
    borderColor: colors.accentGreen,
  },
  kindChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  kindChipTextActive: {
    color: colors.accentGreen,
  },
  kindGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notesInput: {
    minHeight: 86,
    textAlignVertical: 'top',
  },
  notesActionButton: {
    flex: 1,
  },
  notesActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActions: {
    gap: 10,
  },
  photoSourceButton: {
    flex: 1,
  },
  photoSourceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoPlaceholder: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  photoPlaceholderTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  provisionalCard: {
    backgroundColor: '#151922',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  legendDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  legendDotAmber: {
    backgroundColor: colors.amber,
  },
  legendDotGreen: {
    backgroundColor: colors.accentGreen,
  },
  legendDotRed: {
    backgroundColor: colors.red,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  secondaryButtonActive: {
    backgroundColor: '#12251c',
    borderColor: colors.accentGreen,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody,
    fontWeight: '700',
  },
  stationPhoto: {
    backgroundColor: '#151922',
    borderRadius: 16,
    height: 220,
    width: '100%',
  },
  primaryBadge: {
    backgroundColor: '#12251c',
    borderRadius: 999,
    color: colors.accentGreen,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  statusTag: {
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: spacing[1],
    paddingVertical: 4,
  },
  statusTagAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    color: colors.amber,
  },
  statusTagGreen: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    color: colors.accentGreen,
  },
  statusTagMuted: {
    backgroundColor: '#151922',
    color: colors.textSecondary,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  summaryChip: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: borderRadius[1],
    borderWidth: 1,
    flex: 1,
    gap: 2,
    minWidth: 120,
    padding: spacing[2],
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  technicalBlock: {
    borderTopColor: '#2a2f3a',
    borderTopWidth: 1,
    gap: spacing[1],
    paddingTop: spacing[2],
  },
  technicalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'space-between',
  },
  technicalHeaderText: {
    flex: 1,
    gap: 4,
  },
  technicalToggleText: {
    color: colors.accentGreen,
    fontSize: typography.fontSizeBody,
    fontWeight: '800',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  visualPhotoBody: {
    gap: 6,
    padding: 12,
  },
  visualPhotoCard: {
    backgroundColor: '#151922',
    borderColor: '#2a2f3a',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  visualPhotoForm: {
    borderTopColor: '#2a2f3a',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  visualPhotoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visualPhotoImage: {
    backgroundColor: '#0f1117',
    height: 190,
    width: '100%',
  },
  visualPhotoKind: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
