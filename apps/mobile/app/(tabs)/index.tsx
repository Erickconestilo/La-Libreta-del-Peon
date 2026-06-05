import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, ImageBackground, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ProjectSummary } from '@shared/types';
import { useCurrentSession } from '@/hooks/use-auth';
import { useProjectPhotoMutations, useProjects } from '@/hooks/use-projects';
import { borderRadius, colors, spacing, typography } from '@/src/theme';

export default function ProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useCurrentSession();
  const { data, errorMessage, isLoading, isRefetching, refetch } = useProjects();
  const [isLoadTakingLong, setIsLoadTakingLong] = useState(false);
  const {
    errorMessage: photoErrorMessage,
    isMutating: isPhotoMutating,
    removeProjectPhoto,
    uploadProjectPhoto
  } = useProjectPhotoMutations(null);
  const projects = data ?? [];
  const canCreateProject = currentUser?.role === 'admin';
  const canEditProjectImage = currentUser?.role === 'admin' || currentUser?.role === 'topografo';

  useEffect(() => {
    if (!isLoading) {
      setIsLoadTakingLong(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsLoadTakingLong(true);
    }, 7000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  const handleEditProjectImage = (project: ProjectSummary) => {
    Alert.alert('Imagen de obra', `Actualiza la portada de ${project.name}.`, [
      {
        onPress: () => {
          void uploadProjectPhoto('camera', project.id).catch(() => undefined);
        },
        text: 'Cámara'
      },
      {
        onPress: () => {
          void uploadProjectPhoto('library', project.id).catch(() => undefined);
        },
        text: 'Galería'
      },
      ...(project.imageUrl
        ? [
            {
              onPress: () => {
                void removeProjectPhoto(project.id).catch(() => undefined);
              },
              style: 'destructive' as const,
              text: 'Quitar imagen'
            }
          ]
        : []),
      {
        style: 'cancel' as const,
        text: 'Cancelar'
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>La Libreta del Peón</Text>
        <Text style={styles.title}>Seleccionar obra</Text>
        <Text style={styles.subtitle}>Elige una obra activa para consultar o registrar datos de campo.</Text>
        {canCreateProject ? (
          <Pressable onPress={() => router.push('/projects/new' as never)} style={styles.createProjectButton}>
            <MaterialIcons color={colors.background} name="add" size={19} />
            <Text style={styles.createProjectButtonText}>Nueva obra</Text>
          </Pressable>
        ) : null}
      </View>

      {errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudieron cargar las obras</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <Pressable disabled={isRefetching} onPress={() => void refetch()} style={[styles.retryButton, isRefetching ? styles.disabledButton : null]}>
            <MaterialIcons color={colors.background} name="refresh" size={17} />
            <Text style={styles.retryButtonText}>{isRefetching ? 'Reintentando...' : 'Reintentar'}</Text>
          </Pressable>
        </View>
      ) : null}

      {photoErrorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>No se pudo actualizar la imagen</Text>
          <Text style={styles.errorBody}>{photoErrorMessage}</Text>
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={[styles.listContent, { paddingBottom: 112 + insets.bottom }]}
        data={projects}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        renderItem={({ item }) => (
          <ProjectCard
            canEditImage={canEditProjectImage}
            isEditingImage={isPhotoMutating}
            onEditImage={() => handleEditProjectImage(item)}
            project={item}
            onPress={() => router.push(`/projects/${item.id}` as never)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>{isLoading ? 'Cargando obras...' : 'Sin obras disponibles'}</Text>
            {isLoadTakingLong ? (
              <>
                <Text style={styles.emptyBody}>El servidor está tardando más de lo normal.</Text>
                <Pressable disabled={isRefetching} onPress={() => void refetch()} style={[styles.retryButton, isRefetching ? styles.disabledButton : null]}>
                  <MaterialIcons color={colors.background} name="refresh" size={17} />
                  <Text style={styles.retryButtonText}>{isRefetching ? 'Reintentando...' : 'Reintentar'}</Text>
                </Pressable>
              </>
            ) : null}
            {!isLoading ? <Text style={styles.emptyBody}>No hay proyectos activos o estaciones asociadas todavía.</Text> : null}
          </View>
        }
      />
    </View>
  );
}

function ProjectCard({
  canEditImage,
  isEditingImage,
  onEditImage,
  onPress,
  project
}: {
  canEditImage: boolean;
  isEditingImage: boolean;
  onEditImage: () => void;
  onPress: () => void;
  project: ProjectSummary;
}) {
  const content = (
    <>
      <View style={styles.statusBadge}>
        <Text style={styles.statusBadgeText}>{project.isActive ? 'Activo' : 'Archivada'}</Text>
      </View>
      <View style={styles.cardSpacer} />
      <Text style={styles.projectTitle}>{project.name}</Text>
      <Text numberOfLines={1} style={styles.projectDescription}>{project.description ?? 'Obra sin descripción'}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.stationCount}>
          <MaterialIcons color={colors.textPrimary} name="gps-fixed" size={17} />
          <Text style={styles.stationCountText}>
            {project.stationCount} estacionamiento{project.stationCount === 1 ? '' : 's'}
          </Text>
        </View>
        <MaterialIcons color={colors.accentGreen} name="arrow-forward" size={24} />
      </View>
      {canEditImage ? (
        <Pressable disabled={isEditingImage} onPress={onEditImage} style={[styles.editImageButton, isEditingImage ? styles.disabledButton : null]}>
          <MaterialIcons color={colors.background} name="photo-camera" size={17} />
          <Text style={styles.editImageButtonText}>{isEditingImage ? 'Procesando...' : project.imageUrl ? 'Cambiar imagen' : 'Añadir imagen'}</Text>
        </Pressable>
      ) : null}
    </>
  );

  return (
    <Pressable onPress={onPress} style={styles.projectCard}>
      {project.imageUrl ? (
        <ImageBackground imageStyle={styles.projectImage} source={{ uri: project.imageUrl }} style={styles.projectImageWrap}>
          <View style={styles.imageOverlay}>{content}</View>
        </ImageBackground>
      ) : (
        <View style={styles.fallbackCover}>
          <View style={styles.fallbackStripe} />
          <View style={[styles.fallbackStripe, styles.fallbackStripeSecond]} />
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(241, 245, 249, 0.12)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
  },
  cardSpacer: {
    height: 70,
  },
  disabledButton: {
    opacity: 0.55,
  },
  editImageButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGreen,
    borderRadius: 999,
    flexDirection: 'row',
    gap: spacing[0],
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  editImageButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  createProjectButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGreen,
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing[0],
    marginTop: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  createProjectButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[5],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizeBody,
    fontWeight: '800',
  },
  errorBody: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody - 1,
    lineHeight: 20,
  },
  errorCard: {
    backgroundColor: colors.card,
    borderLeftColor: colors.red,
    borderLeftWidth: 3,
    marginHorizontal: spacing[3],
    marginTop: spacing[2],
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
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  fallbackCover: {
    backgroundColor: colors.card,
    minHeight: 214,
    overflow: 'hidden',
    padding: spacing[3],
  },
  fallbackStripe: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    height: 160,
    position: 'absolute',
    right: -52,
    top: -42,
    transform: [{ rotate: '-16deg' }],
    width: 190,
  },
  fallbackStripeSecond: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    right: 92,
    top: -78,
  },
  header: {
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[4],
  },
  imageOverlay: {
    backgroundColor: 'rgba(15, 17, 23, 0.68)',
    flex: 1,
    padding: spacing[3],
  },
  listContent: {
    gap: spacing[2],
    padding: spacing[3],
  },
  projectCard: {
    borderColor: '#2a2f3a',
    borderRadius: borderRadius[1],
    borderWidth: 1,
    minHeight: 214,
    overflow: 'hidden',
  },
  projectDescription: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing[0],
  },
  projectImage: {
    opacity: 0.9,
  },
  projectImageWrap: {
    minHeight: 214,
  },
  projectTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentGreen,
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing[0],
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
  stationCount: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1],
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizeBody,
    lineHeight: 22,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
});
