import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CalculatedThresholdStatus,
  ControlPoint,
  ControlPointEnvironment,
  ControlPointSide,
  FieldConditions,
  InstrumentReading,
  InstrumentType,
  MonitoringRound,
  MonitoringRoundPoint,
  MonitoringRoundStatus,
  ReadingInsertResponse
} from '@shared/types';

import { apiFetch, isApiRequestError } from '@/lib/api';
import { enqueue, getPendingCount } from '@/lib/offline/outbox';
import { syncOutboxItem } from '@/lib/offline/sync-handlers';
import { flushOutbox, hasConnectivity } from '@/lib/offline/sync-engine';
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
  roundDate: string;
  status: MonitoringRoundStatus;
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
};

type QueuedReadingResult = {
  clientRequestId: string;
  mode: 'queued';
};

type SyncedReadingResult = {
  mode: 'synced';
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

const shouldQueueReadingAfterError = (error: unknown) => {
  return !isApiRequestError(error) || error.status >= 500;
};

export const useMonitoringRounds = (projectId: string | null, status?: MonitoringRoundStatus) => {
  const query = useQuery({
    enabled: Boolean(projectId),
    queryFn: () => fetchMonitoringRounds(projectId as string, status),
    queryKey: ['monitoring-rounds', projectId, status ?? 'all'],
    staleTime: 1000 * 30
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudieron cargar las rondas.') : null
  };
};

export const useMonitoringRound = (roundId: string | null) => {
  const query = useQuery({
    enabled: Boolean(roundId),
    queryFn: () => fetchMonitoringRound(roundId as string),
    queryKey: ['monitoring-round', roundId],
    staleTime: 1000 * 15
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudo cargar la ronda.') : null
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

      const id = createRandomId();
      const clientRequestId = createRandomId();
      const connected = await hasConnectivity();

      if (connected) {
        try {
          const response = await createInstrumentReadingRequest({ clientRequestId, input, roundPointId });
          return { mode: 'synced', response };
        } catch (error) {
          if (!shouldQueueReadingAfterError(error)) {
            throw error;
          }
          console.warn('[useCreateInstrumentReading] Direct sync failed, enqueueing:', error);
        }
      }

      enqueue({
        clientRequestId,
        entityType: 'medicion',
        id,
        operation: 'insert',
        payload: {
          ...input,
          roundPointId
        }
      });

      console.log(
        `[useCreateInstrumentReading] Enqueued reading ${id} with clientRequestId ${clientRequestId} for later sync`
      );

      return { clientRequestId, mode: 'queued' };
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
