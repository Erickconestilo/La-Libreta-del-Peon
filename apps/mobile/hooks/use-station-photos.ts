import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PhotoContentType, SignedPhotoUpload, StationPhoto, StationPhotoKind } from '@shared/types';

import { apiFetch } from '@/lib/api';
import { fetchWithTimeout } from '@/lib/fetch-timeout';
import { pickAndCompressPhoto, type PhotoSource } from '@/lib/photo-upload';

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    details?: unknown;
    message: string;
  };
  meta?: Record<string, unknown>;
};

export interface CreateStationVisualPhotoInput {
  isPrimary: boolean;
  kind: StationPhotoKind;
  notes: string | null;
  source: PhotoSource;
  title: string | null;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ha ocurrido un error inesperado cargando fotos.';
};

const fetchStationPhotos = async (stationId: string) => {
  const response = await apiFetch<ApiEnvelope<StationPhoto[]>>(`/stations/${stationId}/photos`);
  return response.data;
};

const requestSignedStationPhotoUpload = async ({
  contentType,
  fileSizeBytes,
  stationId
}: {
  contentType: PhotoContentType;
  fileSizeBytes: number;
  stationId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<SignedPhotoUpload>>('/uploads/photos/sign', {
    body: JSON.stringify({
      contentType,
      entityId: stationId,
      entityType: 'station',
      fileSizeBytes
    }),
    method: 'POST'
  });

  return response.data;
};

const createStationPhoto = async ({
  input,
  stationId,
  storagePath
}: {
  input: Omit<CreateStationVisualPhotoInput, 'source'>;
  stationId: string;
  storagePath: string;
}) => {
  const response = await apiFetch<ApiEnvelope<StationPhoto>>(`/stations/${stationId}/photos`, {
    body: JSON.stringify({
      isPrimary: input.isPrimary,
      kind: input.kind,
      notes: input.notes,
      storagePath,
      title: input.title
    }),
    method: 'POST'
  });

  return response.data;
};

const deleteStationPhoto = async ({
  stationId,
  stationPhotoId
}: {
  stationId: string;
  stationPhotoId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<{ deleted: boolean; id: string }>>(
    `/stations/${stationId}/photos/${stationPhotoId}`,
    {
      method: 'DELETE'
    }
  );

  return response.data;
};

export const useStationPhotos = (stationId: string | null) => {
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchStationPhotos(stationId as string),
    queryKey: ['station-photos', stationId],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useStationPhotoGalleryMutations = (stationId: string | null) => {
  const queryClient = useQueryClient();

  const invalidateStationPhotos = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['station-photos', stationId] }),
      queryClient.invalidateQueries({ queryKey: ['station-detail', stationId] }),
      queryClient.invalidateQueries({ queryKey: ['stations'] }),
      queryClient.invalidateQueries({ queryKey: ['change-logs'] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (input: CreateStationVisualPhotoInput) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para subir la foto.');
      }

      const preparedPhoto = await pickAndCompressPhoto(input.source);

      if (!preparedPhoto) {
        return null;
      }

      const signedUpload = await requestSignedStationPhotoUpload({
        contentType: preparedPhoto.contentType,
        fileSizeBytes: preparedPhoto.fileSizeBytes,
        stationId
      });

      const uploadResponse = await fetchWithTimeout(signedUpload.signedUrl, {
        body: preparedPhoto.blob,
        headers: {
          'cache-control': 'max-age=31536000',
          'content-type': preparedPhoto.contentType,
          'x-upsert': 'false'
        },
        method: 'PUT',
        timeoutMessage: 'La subida de la foto tardó demasiado. Reintenta con buena conexión.',
        timeoutMs: 60000
      });

      if (!uploadResponse.ok) {
        throw new Error(`No se pudo subir la foto a Storage (${uploadResponse.status}).`);
      }

      return createStationPhoto({
        input,
        stationId,
        storagePath: signedUpload.path
      });
    },
    onSuccess: invalidateStationPhotos
  });

  const deleteMutation = useMutation({
    mutationFn: async (stationPhotoId: string) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para borrar la foto.');
      }

      return deleteStationPhoto({
        stationId,
        stationPhotoId
      });
    },
    onSuccess: invalidateStationPhotos
  });

  const error = createMutation.error ?? deleteMutation.error ?? null;

  return {
    addStationPhoto: createMutation.mutateAsync,
    deleteStationPhoto: deleteMutation.mutateAsync,
    errorMessage: error ? getErrorMessage(error) : null,
    isMutating: createMutation.isPending || deleteMutation.isPending
  };
};
