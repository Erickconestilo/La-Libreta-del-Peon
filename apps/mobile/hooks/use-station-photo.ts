import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { PhotoContentType, SignedPhotoUpload, Station } from '@shared/types';

import { apiFetch } from '@/lib/api';
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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ha ocurrido un error inesperado subiendo la foto.';
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

const attachStationPhoto = async ({
  stationId,
  storagePath
}: {
  stationId: string;
  storagePath: string | null;
}) => {
  const response = await apiFetch<ApiEnvelope<Station>>(`/stations/${stationId}/photo`, {
    body: JSON.stringify({
      storagePath
    }),
    method: 'PATCH'
  });

  return response.data;
};

export const useStationPhotoMutations = (stationId: string | null) => {
  const queryClient = useQueryClient();

  const invalidateStation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['station-detail', stationId] }),
      queryClient.invalidateQueries({ queryKey: ['stations'] }),
      queryClient.invalidateQueries({ queryKey: ['change-logs'] })
    ]);
  };

  const uploadMutation = useMutation({
    mutationFn: async (source: PhotoSource) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para subir la foto.');
      }

      const preparedPhoto = await pickAndCompressPhoto(source);

      if (!preparedPhoto) {
        return null;
      }

      const signedUpload = await requestSignedStationPhotoUpload({
        contentType: preparedPhoto.contentType,
        fileSizeBytes: preparedPhoto.fileSizeBytes,
        stationId
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
        throw new Error(`No se pudo subir la foto a Storage (${uploadResponse.status}).`);
      }

      return attachStationPhoto({
        stationId,
        storagePath: signedUpload.path
      });
    },
    onSuccess: invalidateStation
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!stationId) {
        throw new Error('Falta el id de estación para quitar la foto.');
      }

      return attachStationPhoto({
        stationId,
        storagePath: null
      });
    },
    onSuccess: invalidateStation
  });

  const error = uploadMutation.error ?? removeMutation.error ?? null;

  return {
    errorMessage: error ? getErrorMessage(error) : null,
    isMutating: uploadMutation.isPending || removeMutation.isPending,
    removeStationPhoto: removeMutation.mutateAsync,
    uploadStationPhoto: uploadMutation.mutateAsync
  };
};
