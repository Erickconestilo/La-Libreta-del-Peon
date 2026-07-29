import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { CreateStationMessageInput, StationMessage } from '@shared/types';

import { apiFetch } from '@/lib/api';
import { enqueue, getPendingCount } from '@/lib/offline/outbox';
import { initSyncEngine, flushOutbox, hasConnectivity } from '@/lib/offline/sync-engine';
import type { OutboxItem } from '@/lib/offline/outbox';

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

  return 'Ha ocurrido un error inesperado cargando mensajes.';
};

const fetchStationMessages = async (stationId: string) => {
  const response = await apiFetch<ApiEnvelope<StationMessage[]>>(`/stations/${stationId}/messages`);
  return response.data;
};

const fetchRecentStationMessages = async () => {
  const response = await apiFetch<ApiEnvelope<StationMessage[]>>('/stations/messages?limit=100');
  return response.data;
};

const createStationMessage = async ({
  input,
  stationId
}: {
  input: CreateStationMessageInput;
  stationId: string;
}) => {
  const response = await apiFetch<ApiEnvelope<StationMessage>>(`/stations/${stationId}/messages`, {
    body: JSON.stringify(input),
    method: 'POST'
  });

  return response.data;
};

/**
 * Callback de sincronización para el sync engine
 * Envía un item de outbox al servidor
 */
const syncStationMessage = async (item: OutboxItem): Promise<void> => {
  if (item.entityType !== 'station_message') {
    throw new Error(`Unexpected entity type: ${item.entityType}`);
  }

  const payload = item.payload as unknown as CreateStationMessageInput & { stationId: string };

  const response = await apiFetch<ApiEnvelope<StationMessage>>(
    `/stations/${payload.stationId}/messages`,
    {
      body: JSON.stringify({
        body: payload.body,
        clientRequestId: item.clientRequestId,
      }),
      method: 'POST'
    }
  );

  if (!response.data) {
    throw new Error('Server returned no data');
  }
};

export const useStationMessages = (stationId: string | null) => {
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchStationMessages(stationId as string),
    queryKey: ['station-messages', stationId],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useRecentStationMessages = (enabled = true) => {
  const query = useQuery({
    enabled,
    queryFn: fetchRecentStationMessages,
    queryKey: ['station-messages-feed'],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useCreateStationMessage = (stationId: string | null) => {
  const queryClient = useQueryClient();

  // Inicializar sync engine al montar el hook
  useEffect(() => {
    initSyncEngine(syncStationMessage);
  }, []);

  const mutation = useMutation({
    mutationFn: async (input: CreateStationMessageInput) => {
      if (!stationId) {
        throw new Error('Station id is required.');
      }

      const connected = await hasConnectivity();

      // Si hay conectividad, intentar envío directo
      if (connected) {
        try {
          return await createStationMessage({ input, stationId });
        } catch (err) {
          // Si falla, encolar en outbox como fallback
          console.warn('[useCreateStationMessage] Direct sync failed, enqueueing:', err);
        }
      }

      // Sin conectividad o fallo directo: encolar en outbox
      const id = crypto.randomUUID();
      const clientRequestId = crypto.randomUUID();

      enqueue({
        id,
        clientRequestId,
        entityType: 'station_message',
        operation: 'insert',
        payload: {
          ...input,
          stationId,
        },
      });

      console.log(
        `[useCreateStationMessage] Enqueued message ${id} with clientRequestId ${clientRequestId} for later sync`
      );

      // Retornar un objeto mock para que el UI no falle
      return {
        id: clientRequestId,
        stationId,
        body: input.body,
        createdAt: new Date().toISOString(),
        createdBy: '',
        createdByUser: null,
      } satisfies StationMessage;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['station-messages', stationId] });
      await queryClient.invalidateQueries({ queryKey: ['station-messages-feed'] });
      await queryClient.invalidateQueries({ queryKey: ['change-logs'] });

      // Intentar flush automático si hay conectividad
      const connected = await hasConnectivity();
      if (connected) {
        void flushOutbox(syncStationMessage);
      }
    }
  });

  return {
    createMessage: mutation.mutateAsync,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    isCreating: mutation.isPending,
    pendingCount: getPendingCount(), // Útil para mostrar badge en UI
  };
};
