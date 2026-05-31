import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, ImageBackground, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCurrentSession } from '@/hooks/use-auth';
import { useProjectPhotoMutations, useProjects } from '@/hooks/use-projects';
import { useStations } from '@/hooks/use-stations';
import { StationCard } from '@/src/components/StationCard';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

export default function ProjectDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const { currentUser } = useCurrentSession();
  const { data: projects, refetch: refetchProjects } = useProjects();
  const {
    data: stations,
    errorMessage: stationsErrorMessage,
    isLoading,
    isRefetching,
    refetch
  } = useStations(projectId);
  const {
    errorMessage: photoErrorMessage,
    isMutating,
    removeProjectPhoto,
    uploadProjectPhoto
  } = useProjectPhotoMutations(projectId ?? null);
  const canEditProjectImage = currentUser?.role === 'admin' || currentUser?.role === 'topografo';
  const project = useMemo(
    () => (projects ?? []).find((item) => item.id === projectId),
    [projectId, projects]
  );

  const handleUploadImage = () => {
    Alert.alert('Imagen de obra', 'Elige una imagen horizontal para identificar esta obra.', [
      {
        onPress: () => {
          void uploadProjectPhoto('camera').then(() => refetchProjects()).catch(() => undefined);
        },
        text: 'Cámara'
      },
      {
        onPress: () => {
          void uploadProjectPhoto('library').then(() => refetchProjects()).catch(() => undefined);
        },
        text: 'Galería'
      },
      {
        style: 'cancel',
        text: 'Cancelar'
      }
    ]);
  };

  const handleRemoveImage = () => {
    Alert.alert('Quitar imagen', 'La tarjeta de obra volverá al fondo gráfico por defecto.', [
      {
        style: 'cancel',
        text: 'Cancelar'
      },
      {
        onPress: () => {
          void removeProjectPhoto().then(() => refetchProjects()).catch(() => undefined);
        },
        style: 'destructive',
        text: 'Quitar'
      }
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: project?.name ?? 'Obra' }} />
      <FlatList
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
        data={stations ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void Promise.all([refetch(), refetchProjects()])} />}
        renderItem={({ item }) => <StationCard station={item} onPress={(stationId) => router.push(`/station/${stationId}` as never)} />}
        style={styles.container}
        ListHeaderComponent={
          <>
            <View style={styles.heroCard}>
              {project?.imageUrl ? (
                <ImageBackground imageStyle={styles.heroImage} source={{ uri: project.imageUrl }} style={styles.heroImageWrap}>
                  <View style={styles.heroOverlay}>
                    <ProjectHeroContent
                      description={project.description}
                      isActive={project.isActive}
                      name={project.name}
                      stationCount={project.stationCount}
                    />
                  </View>
                </ImageBackground>
              ) : (
                <View style={styles.heroFallback}>
                  <View style={styles.fallbackStripe} />
                  <View style={[styles.fallbackStripe, styles.fallbackStripeSecond]} />
                  <ProjectHeroContent
                    description={project?.description ?? 'Obra sin descripción'}
                    isActive={project?.isActive ?? true}
                    name={project?.name ?? 'Obra'}
                    stationCount={project?.stationCount ?? stations?.length ?? 0}
                  />
                </View>
              )}
            </View>

            {canEditProjectImage ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Imagen de obra</Text>
                <Text style={styles.body}>Usa una foto tipo portada para reconocer la obra antes de entrar a sus estacionamientos.</Text>
                {photoErrorMessage ? <Text style={styles.errorText}>{photoErrorMessage}</Text> : null}
                <View style={styles.actionRow}>
                  <Pressable disabled={isMutating} onPress={handleUploadImage} style={[styles.primaryButton, isMutating ? styles.disabledButton : null]}>
                    <Text style={styles.primaryButtonText}>{isMutating ? 'Procesando...' : project?.imageUrl ? 'Cambiar imagen' : 'Añadir imagen'}</Text>
                  </Pressable>
                  {project?.imageUrl ? (
                    <Pressable disabled={isMutating} onPress={handleRemoveImage} style={[styles.secondaryButton, isMutating ? styles.disabledButton : null]}>
                      <Text style={styles.secondaryButtonText}>Quitar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Estacionamientos</Text>
                <Text style={styles.body}>
                  {(stations ?? []).length} estacionamiento{(stations ?? []).length === 1 ? '' : 's'} en esta obra.
                </Text>
              </View>
              {canEditProjectImage ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      params: { projectId },
                      pathname: '/station/new'
                    } as never)
                  }
                  style={styles.addStationButton}
                >
                  <MaterialIcons color={colors.background} name="add" size={20} />
                </Pressable>
              ) : null}
            </View>

            {stationsErrorMessage ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>No se pudieron cargar estaciones</Text>
                <Text style={styles.body}>{stationsErrorMessage}</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Sin estacionamientos</Text>
              <Text style={styles.body}>Todavía no hay estaciones asociadas a esta obra.</Text>
            </View>
          ) : null
        }
      />
    </>
  );
}

function ProjectHeroContent({
  description,
  isActive,
  name,
  stationCount
}: {
  description: string | null | undefined;
  isActive: boolean;
  name: string;
  stationCount: number;
}) {
  return (
    <>
      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>{isActive ? 'Activo' : 'Archivada'}</Text>
      </View>
      <View style={styles.heroSpacer} />
      <Text style={styles.heroTitle}>{name}</Text>
      <Text numberOfLines={2} style={styles.heroDescription}>{description ?? 'Obra sin descripción'}</Text>
      <View style={styles.heroFooter}>
        <MaterialIcons color={colors.textPrimary} name="gps-fixed" size={17} />
        <Text style={styles.stationCountText}>
          {stationCount} estacionamiento{stationCount === 1 ? '' : 's'}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  addStationButton: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
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
  emptyCard: {
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[4],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody,
    fontWeight: '800',
  },
  errorCard: {
    backgroundColor: colors.card,
    borderLeftColor: colors.red,
    borderLeftWidth: 3,
    padding: spacing[3],
  },
  errorText: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 20,
  },
  errorTitle: {
    color: colors.red,
    fontSize: typography.fontSizeBody,
    fontWeight: '800',
    marginBottom: spacing[0],
  },
  fallbackStripe: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    height: 170,
    position: 'absolute',
    right: -48,
    top: -44,
    transform: [{ rotate: '-16deg' }],
    width: 200,
  },
  fallbackStripeSecond: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    right: 112,
    top: -82,
  },
  heroCard: {
    borderColor: '#2a2f3a',
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 238,
    overflow: 'hidden',
  },
  heroDescription: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing[0],
  },
  heroFallback: {
    backgroundColor: colors.card,
    minHeight: 238,
    overflow: 'hidden',
    padding: spacing[3],
  },
  heroFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(241, 245, 249, 0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[1],
    paddingTop: spacing[2],
  },
  heroImage: {
    opacity: 0.92,
  },
  heroImageWrap: {
    minHeight: 238,
  },
  heroOverlay: {
    backgroundColor: 'rgba(15, 17, 23, 0.68)',
    flex: 1,
    padding: spacing[3],
  },
  heroSpacer: {
    height: 84,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accentGreen,
    borderRadius: 12,
    flex: 1,
    paddingVertical: spacing[2],
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#2a2f3a',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeTitle,
    fontWeight: '900',
  },
  stationCountText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGreen,
    borderRadius: 999,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0],
  },
  statusBadgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
});
