import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CalculatedThresholdStatus,
  ControlPoint,
  ControlPointEnvironment,
  ControlPointSide,
  ControlPointThreshold,
  FieldConditions,
  InstrumentReading,
  InstrumentType,
  JourneyRound,
  MonitoringRound,
  MonitoringRoundPoint,
  MonitoringRoundStatus,
  ProjectOperator,
  ReadingInsertResponse
} from '@shared/types';

import { apiFetch, isApiRequestError } from '@/lib/api';
import { enqueue, getPendingCount, getRoundOutboxItems } from '@/lib/offline/outbox';
import {
  getCachedMonitoringRoundList,
  getMonitoringRoundSnapshot,
  saveMonitoringRoundList,
  saveMonitoringRoundSnapshot,
  type MonitoringRoundSnapshot
} from '@/lib/offline/monitoring-cache';
import { deferJourneyRound, getCachedJourney, getDeferredJourneyRoundIds, saveJourney } from '@/lib/offline/journey-cache';
import { useCurrentSession } from '@/hooks/use-auth';
import { syncOutboxItem } from '@/lib/offline/sync-handlers';
import { flushOutbox, hasConnectivity } from '@/lib/offline/sync-engine';
import {
  deletePreparedPhoto,
  persistPreparedPhotoForOffline,
  uploadPreparedPhotoToSignedUrl,
  type PreparedPhoto
} from '@/lib/photo-upload';
import { createRandomId } from '@/lib/random-id';

type ApiEnvelope<T> = {
  data: T;
  error: null | {
    code?: string;
    details?: unknown;
    message: string;
  };
  meta?: Record<string, unknown>;
};

export type MonitoringInstrumentType = Exclude<InstrumentType, 'total_station'>;

export type MonitoringRoundPointDetail = MonitoringRoundPoint & {
  controlPointCode: string;
  controlPointName: string | null;
};

export type MonitoringRoundDetail = MonitoringRound & {
  points: MonitoringRoundPointDetail[];
};

export type CreateMonitoringRoundInput = {
  fieldConditions: FieldConditions | null;
  instrumentSerial: string | null;
  name: string;
  operatorId: string | null;
  executionOrder: number;
  roundDate: string;
  status: MonitoringRoundStatus;
};

export type UpdateMonitoringRoundAssignmentInput = {
  executionOrder?: number;
  operatorId?: string | null;
  roundDate?: string;
};

export type CreateControlPointInput = {
  code: string;
  environment: ControlPointEnvironment;
  name: string | null;
  notes: string | null;
  pk: string | null;
  seccion: string | null;
  side: ControlPointSide | null;
  tramo: string | null;
  zona: string | null;
};

export type UpdateControlPointInput = Partial<Omit<CreateControlPointInput, 'code'>> & {
  isActive?: boolean;
};

export type CreateRoundPointInput = {
  controlPointId: string;
  expectedInstrumentType: MonitoringInstrumentType;
  notes: string | null;
  sortOrder?: number;
};

export type CreateInstrumentReadingInput = {
  measuredAt: string;
  notes: string | null;
  rawPayload?: Record<string, unknown> | null;
  unit: string | null;
  valueNumeric: number | null;
  valueText: string | null;
  photo?: PreparedPhoto | null;
};

type ReadingAttachmentPayload = {
  notes: string | null;
  photo: PreparedPhoto;
  readingClientRequestId: string;
  readingInput: Omit<CreateInstrumentReadingInput, 'photo'>;
  roundId: string;
  roundPointId: string;
  title: string | null;
};

type SignedPhotoUpload = {
  path: string;
  signedUrl: string;
};

type QueuedReadingResult = {
  clientRequestId: string;
  mode: 'queued';
  photoPending: boolean;
};

type SyncedReadingResult = {
  mode: 'synced';
  photoPending: boolean;
  response: ReadingInsertResponse;
};

export type ReadingSubmitResult = QueuedReadingResult | SyncedReadingResult;

export const MONITORING_INSTRUMENTS: Array<{ label: string; value: MonitoringInstrumentType }> = [
  { label: 'Nivel digital', value: 'digital_level' },
  { label: 'Piezómetro', value: 'piezometer' },
  { label: 'Distanciómetro', value: 'distometer' },
  { label: 'Linómetro', value: 'linometer' },
  { label: 'Inclinómetro', value: 'inclinometer' },
  { label: 'Regla de peralte', value: 'cant_rule' }
];

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const fetchMonitoringRounds = async (projectId: string, status?: MonitoringRoundStatus) => {
  const search = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await apiFetch<ApiEnvelope<MonitoringRound[]>>(`/projects/${projectId}/rounds${search}`);
  return response.data;
};

const fetchMonitoringRound = async (roundId: string) => {
  const response = await apiFetch<ApiEnvelope<MonitoringRoundDetail>>(`/rounds/${roundId}`);
  return response.data;
};

const fetchMyJourney = async () => {
  const response = await apiFetch<ApiEnvelope<JourneyRound[]>>('/me/journey');
  return response.data;
};

const fetchMyJourneyWithCache = async (cacheKey: string) => {
  try {
    const rounds = await fetchMyJourney();
    saveJourney(cacheKey, rounds);
    return { cachedAt: null, isOfflineCache: false, rounds };
  } catch (error) {
    const cached = getCachedJourney(cacheKey);
    if (!cached) throw error;
    return { cachedAt: cached.cachedAt, isOfflineCache: true, rounds: cached.rounds };
  }
};

const fetchControlPointThresholds = async (controlPointId: string) => {
  const response = await apiFetch<ApiEnvelope<ControlPointThreshold[]>>(`/control-points/${controlPointId}/thresholds`);
  return response.data;
};

const fetchMonitoringRoundsWithCache = async (projectId: string, status?: MonitoringRoundStatus) => {
  try {
    const rounds = await fetchMonitoringRounds(projectId, status);

    if (!status) {
      const cachedAt = new Date().toISOString();
      saveMonitoringRoundList(projectId, rounds, cachedAt);
      return { cachedAt: null, isOfflineCache: false, rounds };
    }

    return { cachedAt: null, isOfflineCache: false, rounds };
  } catch (error) {
    if (status) {
      throw error;
    }

    const cached = getCachedMonitoringRoundList(projectId);

    if (!cached) {
      throw error;
    }

    return {
      cachedAt: cached.cachedAt,
      isOfflineCache: true,
      rounds: cached.rounds
    };
  }
};

const buildRoundSnapshot = (
  round: MonitoringRoundDetail,
  existing?: MonitoringRoundSnapshot | null
): MonitoringRoundSnapshot => ({
  cachedAt: new Date().toISOString(),
  readingsByControlPointId: existing?.readingsByControlPointId ?? {},
  round,
  thresholdsByControlPointId: existing?.thresholdsByControlPointId ?? {}
});

const fetchMonitoringRoundWithCache = async (roundId: string) => {
  try {
    const round = await fetchMonitoringRound(roundId);
    const cached = getMonitoringRoundSnapshot(roundId);
    const assignmentConflict = Boolean(
      cached &&
      getRoundOutboxItems(roundId).length > 0 &&
      (cached.round.operatorId !== round.operatorId ||
        cached.round.roundDate !== round.roundDate ||
        cached.round.executionOrder !== round.executionOrder)
    );
    const snapshot = buildRoundSnapshot(round, cached);
    saveMonitoringRoundSnapshot(roundId, snapshot);
    return { assignmentConflict, cachedAt: null, isOfflineCache: false, round };
  } catch (error) {
    const cached = getMonitoringRoundSnapshot(roundId);

    if (!cached) {
      throw error;
    }

    return {
      assignmentConflict: false,
      cachedAt: cached.cachedAt,
      isOfflineCache: true,
      round: cached.round
    };
  }
};

const prepareMonitoringRoundRequest = async (roundId: string) => {
  if (!(await hasConnectivity())) {
    throw new Error('Conecta el móvil para descargar la jornada antes de trabajar sin conexión.');
  }

  const round = await fetchMonitoringRound(roundId);
  const readingsByControlPointId: Record<string, InstrumentReading[]> = {};
  const thresholdsByControlPointId: Record<string, ControlPointThreshold[]> = {};

  await Promise.all(
    round.points.map(async (point) => {
      const [readings, thresholds] = await Promise.all([
        point.expectedInstrumentType === 'total_station'
          ? Promise.resolve([] as InstrumentReading[])
          : fetchReadingHistory(point.controlPointId, point.expectedInstrumentType),
        fetchControlPointThresholds(point.controlPointId)
      ]);
      readingsByControlPointId[point.controlPointId] = readings;
      thresholdsByControlPointId[point.controlPointId] = thresholds;
    })
  );

  const snapshot: MonitoringRoundSnapshot = {
    cachedAt: new Date().toISOString(),
    readingsByControlPointId,
    round,
    thresholdsByControlPointId
  };
  saveMonitoringRoundSnapshot(roundId, snapshot);
  return snapshot;
};

const fetchControlPoints = async (projectId: string, isActive?: boolean) => {
  const search = isActive === undefined ? '' : `?isActive=${isActive}`;
  const response = await apiFetch<ApiEnvelope<ControlPoint[]>>(`/projects/${projectId}/control-points${search}`);
  return response.data;
};

const fetchReadingHistory = async (controlPointId: string, instrumentType?: MonitoringInstrumentType) => {
  const search = instrumentType ? `?instrumentType=${encodeURIComponent(instrumentType)}` : '';
  const response = await apiFetch<ApiEnvelope<InstrumentReading[]>>(`/control-points/${controlPointId}/readings${search}`);
  return response.data;
};

const createRoundRequest = async ({ projectId, input }: { projectId: string; input: CreateMonitoringRoundInput }) => {
  const response = await apiFetch<ApiEnvelope<MonitoringRound>>(`/projects/${projectId}/rounds`, {
    body: JSON.stringify(input),
    method: 'POST'
  });
  return response.data;
};

const fetchProjectOperators = async (projectId: string) => {
  const response = await apiFetch<ApiEnvelope<ProjectOperator[]>>(`/projects/${projectId}/operators`);
  return response.data;
};

const updateRoundAssignmentRequest = async (roundId: string, input: UpdateMonitoringRoundAssignmentInput) => {
  const response = await apiFetch<ApiEnvelope<MonitoringRound>>(`/rounds/${roundId}`, {
    body: JSON.stringify(input),
    method: 'PATCH'
  });
  return response.data;
};

const createControlPointRequest = async ({ projectId, input }: { projectId: string; input: CreateControlPointInput }) => {
  const response = await apiFetch<ApiEnvelope<ControlPoint>>(`/projects/${projectId}/control-points`, {
    body: JSON.stringify(input),
    method: 'POST'
  });
  return response.data;
};

const updateControlPointRequest = async ({ controlPointId, input }: { controlPointId: string; input: UpdateControlPointInput }) => {
  const response = await apiFetch<ApiEnvelope<ControlPoint>>(`/control-points/${controlPointId}`, {
    body: JSON.stringify(input),
    method: 'PATCH'
  });
  return response.data;
};

const createRoundPointRequest = async ({ roundId, input }: { roundId: string; input: CreateRoundPointInput }) => {
  const response = await apiFetch<ApiEnvelope<MonitoringRoundPoint>>(`/rounds/${roundId}/points`, {
    body: JSON.stringify(input),
    method: 'POST'
  });
  return response.data;
};

const createInstrumentReadingRequest = async ({
  clientRequestId,
  input,
  roundPointId
}: {
  clientRequestId: string;
  input: CreateInstrumentReadingInput;
  roundPointId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<ReadingInsertResponse>>(`/round-points/${roundPointId}/readings`, {
    body: JSON.stringify({
      ...input,
      clientRequestId
    }),
    method: 'POST'
  });
  return response.data;
};

const requestSignedReadingPhotoUpload = async ({
  fileSizeBytes,
  readingId,
  contentType,
  uploadId
}: {
  contentType: PreparedPhoto['contentType'];
  fileSizeBytes: number;
  readingId: string;
  uploadId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<SignedPhotoUpload>>('/uploads/photos/sign', {
    body: JSON.stringify({
      contentType,
      entityId: readingId,
      entityType: 'reading',
      fileSizeBytes,
      uploadId
    }),
    method: 'POST'
  });

  return response.data;
};

const createReadingAttachmentRequest = async ({
  attachment,
  readingId,
  roundPointId,
  storagePath
}: {
  attachment: Pick<ReadingAttachmentPayload, 'notes' | 'title'>;
  readingId: string;
  roundPointId: string;
  storagePath: string;
}) => {
  await apiFetch<ApiEnvelope<unknown>>(`/round-points/${roundPointId}/readings/${readingId}/attachments`, {
    body: JSON.stringify({
      attachmentType: 'photo',
      notes: attachment.notes,
      storagePath,
      title: attachment.title
    }),
    method: 'POST'
  });
};

const uploadAndAttachReadingPhoto = async ({
  attachment,
  readingId,
  uploadId
}: {
  attachment: Omit<ReadingAttachmentPayload, 'readingClientRequestId' | 'readingInput'>;
  readingId: string;
  uploadId: string;
}) => {
  const signedUpload = await requestSignedReadingPhotoUpload({
    contentType: attachment.photo.contentType,
    fileSizeBytes: attachment.photo.fileSizeBytes,
    readingId,
    uploadId
  });
  const uploadResponse = await uploadPreparedPhotoToSignedUrl(signedUpload.signedUrl, attachment.photo, {
    timeoutMessage: 'La subida de la foto de lectura tardó demasiado. Se reintentará al recuperar conexión.',
    timeoutMs: 60000
  });

  if ((uploadResponse.status < 200 || uploadResponse.status >= 300) && uploadResponse.status !== 409) {
    throw new Error(`No se pudo subir la foto de la lectura (${uploadResponse.status}).`);
  }

  await createReadingAttachmentRequest({
    attachment,
    readingId,
    roundPointId: attachment.roundPointId,
    storagePath: signedUpload.path
  });
};

const enqueueReadingAttachment = (attachment: ReadingAttachmentPayload, clientRequestId: string) => {
  enqueue({
    clientRequestId,
    entityType: 'medicion',
    id: createRandomId(),
    operation: 'update',
    payload: {
      kind: 'reading_attachment',
      ...attachment
    }
  });
};

const shouldQueueReadingAfterError = (error: unknown) => {
  return !isApiRequestError(error) || error.status >= 500;
};

export const useMonitoringRounds = (projectId: string | null, status?: MonitoringRoundStatus) => {
  const query = useQuery({
    enabled: Boolean(projectId),
    queryFn: () => fetchMonitoringRoundsWithCache(projectId as string, status),
    queryKey: ['monitoring-rounds', projectId, status ?? 'all'],
    staleTime: 1000 * 30
  });

  return {
    ...query,
    cachedAt: query.data?.cachedAt ?? null,
    data: query.data?.rounds,
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudieron cargar las rondas.') : null,
    isOfflineCache: query.data?.isOfflineCache ?? false
  };
};

export const useMyJourney = () => {
  const { activeSessionId, currentUser } = useCurrentSession();
  const cacheKey = activeSessionId ? `session:${activeSessionId}` : 'guest';
  const query = useQuery({
    enabled: currentUser?.role === 'admin' || currentUser?.role === 'topografo',
    queryFn: () => fetchMyJourneyWithCache(cacheKey),
    queryKey: ['my-journey', cacheKey],
    staleTime: 1000 * 30
  });

  const deferredIds = getDeferredJourneyRoundIds(cacheKey);
  const rounds = (query.data?.rounds ?? []).filter((round) => !deferredIds.has(round.id));

  return {
    ...query,
    cachedAt: query.data?.cachedAt ?? null,
    data: rounds,
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudo cargar Mi jornada.') : null,
    isOfflineCache: query.data?.isOfflineCache ?? false,
    deferRound: (roundId: string) => {
      const until = new Date();
      until.setHours(23, 59, 59, 999);
      deferJourneyRound(cacheKey, roundId, until.toISOString());
      void query.refetch();
    }
  };
};

export const useProjectOperators = (projectId: string | null) => {
  const query = useQuery({
    enabled: Boolean(projectId),
    queryFn: () => fetchProjectOperators(projectId as string),
    queryKey: ['project-operators', projectId],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    data: query.data ?? [],
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudieron cargar los topógrafos.') : null
  };
};

export const useUpdateMonitoringRoundAssignment = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ input, roundId }: { input: UpdateMonitoringRoundAssignmentInput; roundId: string }) =>
      updateRoundAssignmentRequest(roundId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitoring-rounds'] }),
        queryClient.invalidateQueries({ queryKey: ['my-journey'] })
      ]);
    }
  });

  return {
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo actualizar la asignación.') : null,
    isUpdating: mutation.isPending,
    updateAssignment: mutation.mutateAsync
  };
};

export const useMonitoringRound = (roundId: string | null) => {
  const query = useQuery({
    enabled: Boolean(roundId),
    queryFn: () => fetchMonitoringRoundWithCache(roundId as string),
    queryKey: ['monitoring-round', roundId],
    staleTime: 1000 * 15
  });

  return {
    ...query,
    assignmentConflict: query.data?.assignmentConflict ?? false,
    cachedAt: query.data?.cachedAt ?? null,
    data: query.data?.round,
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudo cargar la ronda.') : null,
    isOfflineCache: query.data?.isOfflineCache ?? false
  };
};

export const usePrepareMonitoringRound = (roundId: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!roundId) {
        throw new Error('Falta la ronda para preparar la jornada.');
      }
      return prepareMonitoringRoundRequest(roundId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['monitoring-round', roundId] });
    }
  });

  return {
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo preparar la jornada.') : null,
    isPreparing: mutation.isPending,
    prepareRound: mutation.mutateAsync
  };
};

export const useUpdateMonitoringRoundStatus = (roundId: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (status: Exclude<MonitoringRoundStatus, 'draft'>) => {
      if (!roundId) {
        throw new Error('Falta la ronda.');
      }

      const response = await apiFetch<ApiEnvelope<MonitoringRound>>(`/rounds/${roundId}`, {
        body: JSON.stringify({ status }),
        method: 'PATCH'
      });
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitoring-round', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['monitoring-rounds'] })
      ]);
    }
  });

  return {
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo actualizar el estado de la ronda.') : null,
    isUpdating: mutation.isPending,
    updateStatus: mutation.mutateAsync
  };
};

export const useControlPoints = (projectId: string | null, isActive?: boolean) => {
  const query = useQuery({
    enabled: Boolean(projectId),
    queryFn: () => fetchControlPoints(projectId as string, isActive),
    queryKey: ['control-points', projectId, isActive ?? 'all'],
    staleTime: 1000 * 30
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudieron cargar los puntos de control.') : null
  };
};

export const useReadingHistory = (controlPointId: string | null, instrumentType?: MonitoringInstrumentType) => {
  const query = useQuery({
    enabled: Boolean(controlPointId),
    queryFn: () => fetchReadingHistory(controlPointId as string, instrumentType),
    queryKey: ['control-point-readings', controlPointId, instrumentType ?? 'all'],
    staleTime: 1000 * 30
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudo cargar el histórico.') : null
  };
};

export const useCreateMonitoringRound = (projectId: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreateMonitoringRoundInput) => {
      if (!projectId) {
        throw new Error('Falta la obra para crear la ronda.');
      }
      return createRoundRequest({ input, projectId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['monitoring-rounds', projectId] });
    }
  });

  return {
    createRound: mutation.mutateAsync,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo crear la ronda.') : null,
    isCreating: mutation.isPending
  };
};

export const useCreateControlPoint = (projectId: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreateControlPointInput) => {
      if (!projectId) {
        throw new Error('Falta la obra para crear el punto.');
      }
      return createControlPointRequest({ input, projectId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['control-points', projectId] });
    }
  });

  return {
    createControlPoint: mutation.mutateAsync,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo crear el punto.') : null,
    isCreating: mutation.isPending
  };
};

export const useUpdateControlPoint = (projectId: string | null, controlPointId: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: UpdateControlPointInput) => {
      if (!controlPointId) {
        throw new Error('Falta el punto de control.');
      }
      return updateControlPointRequest({ controlPointId, input });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['control-points', projectId] });
    }
  });

  return {
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo actualizar el punto.') : null,
    isUpdating: mutation.isPending,
    updateControlPoint: mutation.mutateAsync
  };
};

export const useCreateRoundPoint = (roundId: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreateRoundPointInput) => {
      if (!roundId) {
        throw new Error('Falta la ronda.');
      }
      return createRoundPointRequest({ input, roundId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['monitoring-round', roundId] });
    }
  });

  return {
    createRoundPoint: mutation.mutateAsync,
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo añadir el punto a la ronda.') : null,
    isCreating: mutation.isPending
  };
};

export const useCreateInstrumentReading = ({
  controlPointId,
  roundId,
  roundPointId
}: {
  controlPointId: string | null;
  roundId: string | null;
  roundPointId: string | null;
}) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreateInstrumentReadingInput): Promise<ReadingSubmitResult> => {
      if (!roundPointId) {
        throw new Error('Falta el punto de la ronda.');
      }

      const clientRequestId = createRandomId();
      const { photo, ...readingInput } = input;
      const persistentPhoto = photo ? await persistPreparedPhotoForOffline(photo, clientRequestId) : null;
      const attachmentClientRequestId = persistentPhoto ? createRandomId() : null;
      const connected = await hasConnectivity();

      if (connected) {
        try {
          const response = await createInstrumentReadingRequest({ clientRequestId, input: readingInput, roundPointId });

          if (persistentPhoto && attachmentClientRequestId) {
            const attachment: ReadingAttachmentPayload = {
              notes: null,
              photo: persistentPhoto,
              readingClientRequestId: clientRequestId,
              readingInput,
              roundId: roundId as string,
              roundPointId,
              title: null
            };

            try {
              await uploadAndAttachReadingPhoto({
                attachment,
                readingId: response.reading.id,
                uploadId: attachmentClientRequestId
              });
              await deletePreparedPhoto(persistentPhoto);
            } catch (error) {
              console.warn('[useCreateInstrumentReading] Photo sync failed, enqueueing:', error);
              enqueueReadingAttachment(attachment, attachmentClientRequestId);
              return { mode: 'synced', photoPending: true, response };
            }
          }

          return { mode: 'synced', photoPending: false, response };
        } catch (error) {
          if (!shouldQueueReadingAfterError(error)) {
            await deletePreparedPhoto(persistentPhoto);
            throw error;
          }
          console.warn('[useCreateInstrumentReading] Direct sync failed, enqueueing:', error);
        }
      }

      enqueue({
        clientRequestId,
        entityType: 'medicion',
        id: createRandomId(),
        operation: 'insert',
        payload: {
          ...readingInput,
          roundId: roundId as string,
          roundPointId
        }
      });

      if (persistentPhoto && attachmentClientRequestId) {
        enqueueReadingAttachment({
          notes: null,
          photo: persistentPhoto,
          readingClientRequestId: clientRequestId,
          readingInput,
          roundId: roundId as string,
          roundPointId,
          title: null
        }, attachmentClientRequestId);
      }

      console.log(
        `[useCreateInstrumentReading] Enqueued reading with clientRequestId ${clientRequestId} for later sync`
      );

      return { clientRequestId, mode: 'queued', photoPending: Boolean(persistentPhoto) };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitoring-round', roundId] }),
        queryClient.invalidateQueries({ queryKey: ['control-point-readings', controlPointId] })
      ]);

      if (await hasConnectivity()) {
        void flushOutbox(syncOutboxItem);
      }
    }
  });

  return {
    errorMessage: mutation.error ? getErrorMessage(mutation.error, 'No se pudo guardar la lectura.') : null,
    isCreating: mutation.isPending,
    pendingCount: getPendingCount(),
    submitReading: mutation.mutateAsync
  };
};

export const thresholdStatusLabel = (status: CalculatedThresholdStatus) => {
  switch (status) {
    case 'normal':
      return 'Normal';
    case 'warning':
      return 'Aviso';
    case 'alarm':
      return 'Alarma';
    default:
      return 'Sin umbral';
  }
};
