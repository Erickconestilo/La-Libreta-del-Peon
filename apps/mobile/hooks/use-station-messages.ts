import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateStationMessageInput, StationMessage } from '@shared/types';

import { apiFetch } from '@/lib/api';

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

export const useCreateStationMessage = (stationId: string | null) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreateStationMessageInput) => {
      if (!stationId) {
        throw new Error('Station id is required.');
      }

      return createStationMessage({ input, stationId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['station-messages', stationId] });
      await queryClient.invalidateQueries({ queryKey: ['change-logs'] });
    }
  });

  return {
    createMessage: mutation.mutateAsync,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    isCreating: mutation.isPending
  };
};
