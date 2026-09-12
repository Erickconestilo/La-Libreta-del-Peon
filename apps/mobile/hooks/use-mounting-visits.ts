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
import { apiFetch, isApiRequestError } from '@/lib/api';
import { createRandomId } from '@/lib/random-id';
import { enqueue } from '@/lib/offline/outbox';
import {
  getCachedMountingVisit,
  getCachedMountingVisits,
  mergeCachedMountingVisitUpdate,
  mergeServerMountingVisits,
  saveMountingVisits,
  type CachedMountingEvidence,
  type CachedMountingVisit
} from '@/lib/offline/mounting-cache';
import { flushOutbox, hasConnectivity } from '@/lib/offline/sync-engine';
import { syncOutboxItem } from '@/lib/offline/sync-handlers';
import {
  deletePreparedPhoto,
  pickAndCompressPhoto,
  uploadPreparedPhotoToSignedUrl,
  persistPreparedPhotoForOffline,
  type PhotoSource,
  type PreparedPhoto
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

const fetchMountingVisits = async (cacheKey: string, stationId: string) => {
  try {
    const response = await apiFetch<ApiEnvelope<MountingVisit[]>>(`/stations/${stationId}/mounting-visits`);
    const cached = getCachedMountingVisits(cacheKey, stationId);
    const visits = mergeServerMountingVisits(response.data, cached?.visits ?? []);
    saveMountingVisits(cacheKey, stationId, visits);
    return { cachedAt: null, isOfflineCache: false, visits };
  } catch (error) {
    const cached = getCachedMountingVisits(cacheKey, stationId);
    if (!cached) throw error;

    return {
      cachedAt: cached.cachedAt,
      isOfflineCache: true,
      visits: cached.visits
    };
  }
};

const createMountingVisitRequest = async (
  stationId: string,
  input: CreateMountingVisitFormInput,
  clientRequestId: string
) => {
  const response = await apiFetch<ApiEnvelope<MountingVisit>>(`/stations/${stationId}/mounting-visits`, {
    body: JSON.stringify({
      ...input,
      clientRequestId
    }),
    method: 'POST'
  });

  return response.data;
};

const shouldQueueMountingOperation = (error: unknown) => {
  return !isApiRequestError(error) || error.status >= 500;
};

const getLocalMountingVisit = (
  stationId: string,
  projectId: string,
  recordedBy: string,
  input: CreateMountingVisitFormInput,
  clientRequestId: string
): CachedMountingVisit => {
  const now = new Date().toISOString();

  return {
    changeSummary: input.changeSummary ?? null,
    clientRequestId,
    createdAt: now,
    evidence: [],
    id: createRandomId(),
    notes: input.notes ?? null,
    projectId,
    recordedBy,
    stationId,
    status: input.status ?? 'draft',
    syncState: 'pending',
    updatedAt: now,
    visitedAt: input.visitedAt ?? now
  };
};

const createMountingVisit = async ({
  cacheKey,
  input,
  projectId,
  recordedBy,
  sessionId,
  stationId
}: {
  cacheKey: string;
  input: CreateMountingVisitFormInput;
  projectId: string | null;
  recordedBy: string | null;
  sessionId: string | null;
  stationId: string;
}) => {
  if (!projectId || !recordedBy || !sessionId) {
    throw new Error('La estación debe pertenecer a una obra y la sesión debe ser técnica.');
  }

  const clientRequestId = createRandomId();
  if (await hasConnectivity()) {
    try {
      const remoteVisit = await createMountingVisitRequest(stationId, input, clientRequestId);
      const cached = getCachedMountingVisits(cacheKey, stationId)?.visits ?? [];
      saveMountingVisits(cacheKey, stationId, [remoteVisit, ...cached.filter((visit) => visit.clientRequestId !== clientRequestId)]);
      return remoteVisit;
    } catch (error) {
      if (!shouldQueueMountingOperation(error)) throw error;
    }
  }

  const localVisit = getLocalMountingVisit(stationId, projectId, recordedBy, input, clientRequestId);
  enqueue({
    clientRequestId,
    entityType: 'medicion',
    id: createRandomId(),
    operation: 'insert',
    sessionId,
    payload: {
      kind: 'mounting_visit',
      stationId,
      visitInput: input
    }
  });
  const cached = getCachedMountingVisits(cacheKey, stationId)?.visits ?? [];
  saveMountingVisits(cacheKey, stationId, [localVisit, ...cached.filter((visit) => visit.clientRequestId !== clientRequestId)]);

  return localVisit;
};

const updateMountingVisit = async ({
  cacheKey,
  input,
  sessionId,
  stationId,
  visitId
}: {
  cacheKey: string;
  input: UpdateMountingVisitInput;
  sessionId: string | null;
  stationId: string;
  visitId: string;
}) => {
  if (!sessionId) {
    throw new Error('Necesitas una sesión técnica para actualizar la visita.');
  }

  if (await hasConnectivity()) {
    try {
      const response = await apiFetch<ApiEnvelope<MountingVisit>>(`/stations/${stationId}/mounting-visits/${visitId}`, {
        body: JSON.stringify(input),
        method: 'PATCH'
      });

      return response.data;
    } catch (error) {
      if (!shouldQueueMountingOperation(error)) throw error;
    }
  }

  const cachedVisit = getCachedMountingVisit(cacheKey, stationId, visitId);
  if (!cachedVisit) {
    throw new Error('No se pudo conservar el estado de la visita sin conexión. Vuelve a cargar la memoria de montaje e inténtalo de nuevo.');
  }

  const now = new Date().toISOString();
  const updatedVisit = mergeCachedMountingVisitUpdate(cachedVisit, input, now);
  const updateClientRequestId = createRandomId();

  const cachedVisits = getCachedMountingVisits(cacheKey, stationId)?.visits ?? [];
  saveMountingVisits(
    cacheKey,
    stationId,
    [updatedVisit, ...cachedVisits.filter((visit) => visit.id !== visitId)]
  );
  enqueue({
    clientRequestId: updateClientRequestId,
    entityType: 'medicion',
    id: createRandomId(),
    operation: 'update',
    sessionId,
    payload: {
      kind: 'mounting_visit_update',
      stationId,
      updateInput: input,
      visitClientRequestId: cachedVisit.clientRequestId,
      visitId,
      visitInput: {
        changeSummary: cachedVisit.changeSummary,
        notes: cachedVisit.notes,
        status: 'draft',
        visitedAt: cachedVisit.visitedAt
      }
    }
  });

  return updatedVisit;
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
  cacheKey: string,
  recordedBy: string | null,
  sessionId: string | null,
  visitId: string,
  input: UploadMountingEvidenceInput
) => {
  if (!sessionId) {
    throw new Error('Necesitas una sesión técnica para guardar la evidencia.');
  }

  const preparedPhoto = await pickAndCompressPhoto(input.source);

  if (!preparedPhoto) {
    return null;
  }

  const evidenceClientRequestId = createRandomId();
  let photoForCleanup: PreparedPhoto | null = preparedPhoto;
  let queued = false;

  try {
    const persistentPhoto = await persistPreparedPhotoForOffline(preparedPhoto, evidenceClientRequestId);
    photoForCleanup = persistentPhoto;
    const cachedVisit = getCachedMountingVisit(cacheKey, stationId, visitId);
    const visitClientRequestId = cachedVisit?.syncState === 'pending' ? cachedVisit.clientRequestId : null;
    const evidenceInput = {
      kind: input.kind,
      notes: input.notes ?? null,
      positionX: input.positionX ?? null,
      positionY: input.positionY ?? null,
      prismId: input.prismId ?? null,
      title: input.title ?? null
    };

    const queueEvidence = () => {
      queued = true;
      const localEvidence: CachedMountingEvidence = {
        clientRequestId: evidenceClientRequestId,
        id: createRandomId(),
        kind: input.kind,
        localUri: persistentPhoto.localUri,
        notes: evidenceInput.notes,
        positionX: evidenceInput.positionX,
        positionY: evidenceInput.positionY,
        prismId: evidenceInput.prismId,
        publicUrl: persistentPhoto.localUri,
        stationId,
        storagePath: `offline/${evidenceClientRequestId}`,
        syncState: 'pending',
        title: evidenceInput.title,
        uploadedAt: new Date().toISOString(),
        uploadedBy: recordedBy ?? 'local-session',
        visitId
      };

      enqueue({
        clientRequestId: evidenceClientRequestId,
        entityType: 'medicion',
        id: createRandomId(),
        operation: 'update',
        sessionId,
        payload: {
          evidenceInput,
          kind: 'mounting_evidence',
          photo: persistentPhoto,
          stationId,
          visitClientRequestId,
          visitId,
          visitInput: cachedVisit && visitClientRequestId ? {
            changeSummary: cachedVisit.changeSummary,
            notes: cachedVisit.notes,
            status: cachedVisit.status,
            visitedAt: cachedVisit.visitedAt
          } : null
        }
      });
      if (visitClientRequestId) {
        // The local visit id is intentionally kept in the cache; the sync
        // handler resolves it to the server id using the visit request id.
      }
      return localEvidence;
    };

    if (!(await hasConnectivity()) || visitClientRequestId) {
      const localEvidence = queueEvidence();
      const cachedVisit = getCachedMountingVisit(cacheKey, stationId, visitId);
      if (cachedVisit) {
        const currentVisits = getCachedMountingVisits(cacheKey, stationId)?.visits ?? [];
        const nextVisit = {
          ...cachedVisit,
          evidence: [localEvidence, ...cachedVisit.evidence],
          syncState: 'pending' as const
        };
        saveMountingVisits(cacheKey, stationId, [nextVisit, ...currentVisits.filter((visit) => visit.id !== cachedVisit.id)]);
      }
      return localEvidence;
    }

    try {
      const signedUpload = await requestSignedMountingEvidenceUpload({
        contentType: persistentPhoto.contentType,
        fileSizeBytes: persistentPhoto.fileSizeBytes,
        uploadId: evidenceClientRequestId,
        visitId
      });
      const uploadResponse = await uploadPreparedPhotoToSignedUrl(signedUpload.signedUrl, persistentPhoto, {
        timeoutMessage: 'La subida de la evidencia tardó demasiado. Se reintentará al recuperar conexión.',
        timeoutMs: 60000
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        throw new Error(`No se pudo subir la evidencia a Storage (${uploadResponse.status}).`);
      }

      const response = await apiFetch<ApiEnvelope<MountingEvidence>>(
        `/stations/${stationId}/mounting-visits/${visitId}/evidence`,
        {
          body: JSON.stringify({
            clientRequestId: evidenceClientRequestId,
            ...evidenceInput,
            storagePath: signedUpload.path
          }),
          method: 'POST'
        }
      );

      return response.data;
    } catch (error) {
      if (!shouldQueueMountingOperation(error)) throw error;
      return queueEvidence();
    }
  } finally {
    if (!queued) {
      await deletePreparedPhoto(photoForCleanup);
    }
  }
};

export const useMountingVisits = (stationId: string | null) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchMountingVisits(sessionCacheKey, stationId as string),
    queryKey: ['mounting-visits', sessionCacheKey, stationId],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    cachedAt: query.data?.cachedAt ?? null,
    data: query.data?.visits,
    errorMessage: query.error ? getErrorMessage(query.error) : null,
    isOfflineCache: query.data?.isOfflineCache ?? false
  };
};

export const useMountingVisitMutations = (stationId: string | null, projectId: string | null = null) => {
  const { activeSessionId, currentUser } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const queryClient = useQueryClient();
  const invalidate = () => stationId
    ? queryClient.invalidateQueries({ queryKey: ['mounting-visits', sessionCacheKey, stationId] })
    : Promise.resolve();
  const invalidateAndFlush = async () => {
    await invalidate();
    if (activeSessionId && await hasConnectivity()) {
      void flushOutbox(syncOutboxItem, activeSessionId);
    }
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateMountingVisitFormInput) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para crear la visita.');
      }

      return createMountingVisit({
        cacheKey: sessionCacheKey,
        input,
        projectId,
        recordedBy: currentUser?.id ?? null,
        sessionId: activeSessionId,
        stationId
      });
    },
    onSuccess: invalidateAndFlush
  });

  const evidenceMutation = useMutation({
    mutationFn: (input: UploadMountingEvidenceInput & { visitId: string }) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para guardar la evidencia.');
      }

      return uploadMountingEvidence(stationId, sessionCacheKey, currentUser?.id ?? null, activeSessionId, input.visitId, input);
    },
    onSuccess: invalidateAndFlush
  });

  const updateMutation = useMutation({
    mutationFn: ({ input, visitId }: { input: UpdateMountingVisitInput; visitId: string }) => {
      if (!stationId) {
        throw new Error('Falta el id de estación para actualizar la visita.');
      }

      return updateMountingVisit({
        cacheKey: sessionCacheKey,
        input,
        sessionId: activeSessionId,
        stationId,
        visitId
      });
    },
    onSuccess: invalidateAndFlush
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
