import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { StationPhoto, StationPhotoKind } from '@shared/types';
import { useCurrentSession } from '@/hooks/use-auth';
import { useStationPrisms } from '@/hooks/use-prisms';
import { useStationDetail } from '@/hooks/use-stations';
import {
  useStationPhotoGalleryMutations,
  useStationPhotos
} from '@/hooks/use-station-photos';
import { useStationPhotoMutations } from '@/hooks/use-station-photo';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

const PHOTO_KINDS: Array<{ label: string; value: StationPhotoKind }> = [
  { label: 'General', value: 'general' },
  { label: 'Punto', value: 'point' },
  { label: 'Referencia', value: 'reference' },
  { label: 'Acceso', value: 'access' },
  { label: 'Obstáculo', value: 'obstacle' },
  { label: 'Otro', value: 'other' }
];

export default function StationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const params = useLocalSearchParams<{ stationId: string }>();
  const stationId = Array.isArray(params.stationId) ? params.stationId[0] : params.stationId;
  const { data, errorMessage, isLoading } = useStationDetail(stationId ?? null);
  const [visualPhotoKind, setVisualPhotoKind] = useState<StationPhotoKind>('general');
  const [visualPhotoNotes, setVisualPhotoNotes] = useState('');
  const [visualPhotoTitle, setVisualPhotoTitle] = useState('');
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
    isMutating: isStationPhotoMutating
  } = useStationPhotoGalleryMutations(stationId ?? null);
  const {
    data: prismData,
    errorMessage: prismErrorMessage,
    isLoading: isPrismLoading,
  } = useStationPrisms(stationId ?? null);
  const coverageGroupCode = getCoverageGroupCode(prismData?.prisms);
  const prisms = prismData?.prisms ?? [];
  const canEditPhotos = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const canViewTechnical = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const [showTechnicalData, setShowTechnicalData] = useState(false);

  const handleAddVisualPhoto = (source: 'camera' | 'library') => {
    void addStationPhoto({
      isPrimary: setAsPrimary,
      kind: visualPhotoKind,
      notes: visualPhotoNotes.trim() ? visualPhotoNotes.trim() : null,
      source,
      title: visualPhotoTitle.trim() ? visualPhotoTitle.trim() : null
    })
      .then((photo) => {
        if (photo) {
          setVisualPhotoNotes('');
          setVisualPhotoTitle('');
          setSetAsPrimary(false);
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

  return (
    <>
      <Stack.Screen options={{ title: data?.name ?? 'Detalle de estación' }} />
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
              <Text style={styles.heroTitle}>{data.name}</Text>
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
              <Text style={styles.body}>{data.notes ?? 'Sin notas todavía.'}</Text>
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

function SummaryChip({ label, value }: SummaryChipProps) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

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
