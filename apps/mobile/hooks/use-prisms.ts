import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PhotoContentType, Prism, PrismCoverageGroup, PrismObservation, SignedPhotoUpload } from '@shared/types';

import { apiFetch } from '@/lib/api';
import { deletePreparedPhoto, pickAndCompressPhoto, uploadPreparedPhotoToSignedUrl, type PhotoSource } from '@/lib/photo-upload';

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    details?: unknown;
    message: string;
  };
  meta?: Record<string, unknown>;
};

export type StationPrismListItem = Prism & {
  observationCount: number;
  stationFirstObservedAt: string | null;
  stationLastObservedAt: string | null;
};

export type StationPrismObservation = PrismObservation & {
  prismCode: string;
};

type StationPrismsResponse = {
  observations: StationPrismObservation[];
  prisms: StationPrismListItem[];
  stationId: string;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ha ocurrido un error inesperado cargando prismas.';
};

const fetchStationPrisms = async (stationId: string) => {
  const response = await apiFetch<ApiEnvelope<StationPrismsResponse>>(`/stations/${stationId}/prisms`);
  return response.data;
};

const fetchPrismCoverage = async (groupCode: string) => {
  const response = await apiFetch<ApiEnvelope<PrismCoverageGroup>>(`/prisms/coverage/${encodeURIComponent(groupCode)}`);
  return response.data;
};

const requestSignedPrismPhotoUpload = async ({
  contentType,
  fileSizeBytes,
  prismId
}: {
  contentType: PhotoContentType;
  fileSizeBytes: number;
  prismId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<SignedPhotoUpload>>('/uploads/photos/sign', {
    body: JSON.stringify({
      contentType,
      entityId: prismId,
      entityType: 'prism',
      fileSizeBytes
    }),
    method: 'POST'
  });

  return response.data;
};

const attachPrismPhoto = async ({
  prismId,
  storagePath
}: {
  prismId: string;
  storagePath: string | null;
}) => {
  const response = await apiFetch<ApiEnvelope<Prism>>(`/prisms/${prismId}/photo`, {
    body: JSON.stringify({ storagePath }),
    method: 'PATCH'
  });

  return response.data;
};

export const useStationPrisms = (stationId: string | null) => {
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchStationPrisms(stationId as string),
    queryKey: ['station-prisms', stationId],
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null,
  };
};

export const usePrismPhotoMutations = (stationId: string | null) => {
  const queryClient = useQueryClient();

  const invalidatePrisms = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['station-prisms', stationId] }),
      queryClient.invalidateQueries({ queryKey: ['change-logs'] })
    ]);
  };

  const uploadMutation = useMutation({
    mutationFn: async ({ prismId, source }: { prismId: string; source: PhotoSource }) => {
      const preparedPhoto = await pickAndCompressPhoto(source);

      if (!preparedPhoto) {
        return null;
      }

      try {
        const signedUpload = await requestSignedPrismPhotoUpload({
          contentType: preparedPhoto.contentType,
          fileSizeBytes: preparedPhoto.fileSizeBytes,
          prismId
        });

        const uploadResponse = await uploadPreparedPhotoToSignedUrl(signedUpload.signedUrl, preparedPhoto, {
          timeoutMessage: 'La subida de la foto del prisma tardó demasiado. Reintenta con buena conexión.',
          timeoutMs: 60000
        });

        if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
          throw new Error(`No se pudo subir la foto del prisma a Storage (${uploadResponse.status}).`);
        }

        return attachPrismPhoto({
          prismId,
          storagePath: signedUpload.path
        });
      } finally {
        await deletePreparedPhoto(preparedPhoto);
      }
    },
    onSuccess: invalidatePrisms
  });

  const removeMutation = useMutation({
    mutationFn: async (prismId: string) => {
      return attachPrismPhoto({
        prismId,
        storagePath: null
      });
    },
    onSuccess: invalidatePrisms
  });

  const error = uploadMutation.error ?? removeMutation.error ?? null;

  return {
    errorMessage: error ? getErrorMessage(error) : null,
    isMutating: uploadMutation.isPending || removeMutation.isPending,
    removePrismPhoto: removeMutation.mutateAsync,
    uploadPrismPhoto: (prismId: string, source: PhotoSource) => uploadMutation.mutateAsync({ prismId, source })
  };
};

export const usePrismCoverage = (groupCode: string | null) => {
  const query = useQuery({
    enabled: Boolean(groupCode),
    queryFn: () => fetchPrismCoverage(groupCode as string),
    queryKey: ['prism-coverage', groupCode],
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null,
  };
};
