import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PhotoContentType, ProjectSummary, SignedPhotoUpload, Station } from '@shared/types';

import { apiFetch } from '@/lib/api';
import { pickAndCompressPhoto, type PhotoSource } from '@/lib/photo-upload';

type StationListItem = Station & {
  project?: {
    code: string;
    name: string;
  } | null;
};

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    details?: unknown;
    message: string;
  };
  meta?: Record<string, unknown>;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ha ocurrido un error inesperado cargando obras.';
};

const buildProjectsFromStations = (stations: StationListItem[]): ProjectSummary[] => {
  const projects = new Map<string, ProjectSummary>();

  for (const station of stations) {
    if (!station.projectId || !station.project) {
      continue;
    }

    const current = projects.get(station.projectId);

    if (current) {
      current.stationCount += 1;
      continue;
    }

    projects.set(station.projectId, {
      code: station.project.code,
      createdAt: station.createdAt,
      description: `Obra con estaciones importadas de ${station.project.name}`,
      id: station.projectId,
      imageUrl: null,
      isActive: true,
      name: station.project.name,
      stationCount: 1,
      updatedAt: station.updatedAt
    });
  }

  return Array.from(projects.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const fetchProjects = async () => {
  try {
    const response = await apiFetch<ApiEnvelope<ProjectSummary[]>>('/projects');
    return response.data;
  } catch {
    const fallback = await apiFetch<ApiEnvelope<StationListItem[]>>('/stations');
    return buildProjectsFromStations(fallback.data);
  }
};

const requestSignedProjectPhotoUpload = async ({
  contentType,
  fileSizeBytes,
  projectId
}: {
  contentType: PhotoContentType;
  fileSizeBytes: number;
  projectId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<SignedPhotoUpload>>('/uploads/photos/sign', {
    body: JSON.stringify({
      contentType,
      entityId: projectId,
      entityType: 'project',
      fileSizeBytes
    }),
    method: 'POST'
  });

  return response.data;
};

const updateProjectPhoto = async ({
  projectId,
  storagePath
}: {
  projectId: string;
  storagePath: string | null;
}) => {
  const response = await apiFetch<ApiEnvelope<ProjectSummary>>(`/projects/${projectId}/photo`, {
    body: JSON.stringify({ storagePath }),
    method: 'PATCH'
  });

  return response.data;
};

export const useProjects = () => {
  const query = useQuery({
    queryFn: fetchProjects,
    queryKey: ['projects'],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useProjectPhotoMutations = (projectId: string | null) => {
  const queryClient = useQueryClient();

  const invalidateProjects = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['change-logs'] })
    ]);
  };

  const uploadMutation = useMutation({
    mutationFn: async (source: PhotoSource) => {
      if (!projectId) {
        throw new Error('Falta el id de obra para subir la imagen.');
      }

      const preparedPhoto = await pickAndCompressPhoto(source);

      if (!preparedPhoto) {
        return null;
      }

      const signedUpload = await requestSignedProjectPhotoUpload({
        contentType: preparedPhoto.contentType,
        fileSizeBytes: preparedPhoto.fileSizeBytes,
        projectId
      });

      const uploadResponse = await fetch(signedUpload.signedUrl, {
        body: preparedPhoto.blob,
        headers: {
          'cache-control': 'max-age=31536000',
          'content-type': preparedPhoto.contentType,
          'x-upsert': 'false'
        },
        method: 'PUT'
      });

      if (!uploadResponse.ok) {
        throw new Error(`No se pudo subir la imagen a Storage (${uploadResponse.status}).`);
      }

      return updateProjectPhoto({
        projectId,
        storagePath: signedUpload.path
      });
    },
    onSuccess: invalidateProjects
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) {
        throw new Error('Falta el id de obra para quitar la imagen.');
      }

      return updateProjectPhoto({
        projectId,
        storagePath: null
      });
    },
    onSuccess: invalidateProjects
  });

  const error = uploadMutation.error ?? removeMutation.error ?? null;

  return {
    errorMessage: error ? getErrorMessage(error) : null,
    isMutating: uploadMutation.isPending || removeMutation.isPending,
    removeProjectPhoto: removeMutation.mutateAsync,
    uploadProjectPhoto: uploadMutation.mutateAsync
  };
};
