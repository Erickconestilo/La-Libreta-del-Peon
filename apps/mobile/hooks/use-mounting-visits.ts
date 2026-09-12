import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateMountingEvidenceInput,
  CreateMountingVisitInput,
  MountingEvidence,
  MountingEvidenceKind,
  MountingVisit,
  UpdateMountingVisitInput,
  PhotoContentType,
  SignedPhotoUpload
} from '@shared/types';

import { useCurrentSession, getSessionCacheKey } from '@/hooks/use-auth';
import { apiFetch } from '@/lib/api';
import { createRandomId } from '@/lib/random-id';
import {
  deletePreparedPhoto,
  pickAndCompressPhoto,
  uploadPreparedPhotoToSignedUrl,
  type PhotoSource
} from '@/lib/photo-upload';

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    details?: unknown;
    message: string;
  };
  meta?: Record<string, unknown>;
};

export type CreateMountingVisitFormInput = Omit<CreateMountingVisitInput, 'clientRequestId'>;

export type UploadMountingEvidenceInput = Omit<CreateMountingEvidenceInput, 'clientRequestId' | 'storagePath'> & {
  source: PhotoSource;
};

const getErrorMessage = (error: unknown) => error instanceof Error
  ? error.message
  : 'Ha ocurrido un error inesperado con la memoria de montaje.';

const fetchMountingVisits = async (stationId: string) => {
  const response = await apiFetch<ApiEnvelope<MountingVisit[]>>(`/stations/${stationId}/mounting-visits`);
  return response.data;
};

const createMountingVisit = async (stationId: string, input: CreateMountingVisitFormInput) => {
  const response = await apiFetch<ApiEnvelope<MountingVisit>>(`/stations/${stationId}/mounting-visits`, {
    body: JSON.stringify({
      ...input,
      clientRequestId: createRandomId()
    }),
    method: 'POST'
  });

  return response.data;
};

const updateMountingVisit = async (stationId: string, visitId: string, input: UpdateMountingVisitInput) => {
  const response = await apiFetch<ApiEnvelope<MountingVisit>>(`/stations/${stationId}/mounting-visits/${visitId}`, {
    body: JSON.stringify(input),
    method: 'PATCH'
  });

  return response.data;
};

const requestSignedMountingEvidenceUpload = async ({
  contentType,
  fileSizeBytes,
  uploadId,
  visitId
}: {
  contentType: PhotoContentType;
  fileSizeBytes: number;
  uploadId: string;
  visitId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<SignedPhotoUpload>>('/uploads/photos/sign', {
    body: JSON.stringify({
      contentType,
      entityId: visitId,
      entityType: 'mounting_visit',
      fileSizeBytes,
      uploadId
    }),
    method: 'POST'
  });

  return response.data;
};

const uploadMountingEvidence = async (
  stationId: string,
  visitId: string,
  input: UploadMountingEvidenceInput
) => {
  const preparedPhoto = await pickAndCompressPhoto(input.source);

  if (!preparedPhoto) {
    return null;
  }

  try {
    const signedUpload = await requestSignedMountingEvidenceUpload({
      contentType: preparedPhoto.contentType,
      fileSizeBytes: preparedPhoto.fileSizeBytes,
      uploadId: createRandomId(),
      visitId
    });
    const uploadResponse = await uploadPreparedPhotoToSignedUrl(signedUpload.signedUrl, preparedPhoto, {
      timeoutMessage: 'La subida de la evidencia tardó demasiado. Reintenta con buena conexión.',
      timeoutMs: 60000
    });

    if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
      throw new Error(`No se pudo subir la evidencia a Storage (${uploadResponse.status}).`);
    }

    const response = await apiFetch<ApiEnvelope<MountingEvidence>>(
      `/stations/${stationId}/mounting-visits/${visitId}/evidence`,
      {
        body: JSON.stringify({
          clientRequestId: createRandomId(),
          kind: input.kind,
          notes: input.notes ?? null,
          positionX: input.positionX ?? null,
          positionY: input.positionY ?? null,
          prismId: input.prismId ?? null,
          storagePath: signedUpload.path,
          title: input.title ?? null
        }),
        method: 'POST'
      }
    );

    return response.data;
  } finally {
    await deletePreparedPhoto(preparedPhoto);
  }
};

export const useMountingVisits = (stationId: string | null) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchMountingVisits(stationId as string),
    queryKey: ['mounting-visits', sessionCacheKey, stationId],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useMountingVisitMutations = (stationId: string | null) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const queryClient = useQueryClient();
  const invalidate = () => stationId
    ? queryClient.invalidateQueries({ queryKey: ['mounting-visits', sessionCacheKey, stationId] })
    : Promise.resolve();

  const createMutation = useMutation({
    mutationFn: (input: CreateMountingVisitFormInput) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para crear la visita.');
      }

      return createMountingVisit(stationId, input);
    },
    onSuccess: invalidate
  });

  const evidenceMutation = useMutation({
    mutationFn: (input: UploadMountingEvidenceInput & { visitId: string }) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para guardar la evidencia.');
      }

      return uploadMountingEvidence(stationId, input.visitId, input);
    },
    onSuccess: invalidate
  });

  const updateMutation = useMutation({
    mutationFn: ({ input, visitId }: { input: UpdateMountingVisitInput; visitId: string }) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para actualizar la visita.');
      }

      return updateMountingVisit(stationId, visitId, input);
    },
    onSuccess: invalidate
  });

  const error = createMutation.error ?? evidenceMutation.error ?? updateMutation.error ?? null;

  return {
    createVisit: createMutation.mutateAsync,
    errorMessage: error ? getErrorMessage(error) : null,
    isMutating: createMutation.isPending || evidenceMutation.isPending || updateMutation.isPending,
    updateVisit: updateMutation.mutateAsync,
    uploadEvidence: evidenceMutation.mutateAsync
  };
};

export const MOUNTING_EVIDENCE_KINDS: Array<{ label: string; value: MountingEvidenceKind }> = [
  { label: 'General', value: 'general' },
  { label: 'Prisma', value: 'prism' },
  { label: 'Referencia', value: 'reference' },
  { label: 'Acceso', value: 'access' },
  { label: 'Otro', value: 'other' }
];
