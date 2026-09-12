import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { CreateIncidentInput, Incident } from '@shared/types';

import { apiFetch } from '@/lib/api';
import { getSessionCacheKey, useCurrentSession } from '@/hooks/use-auth';

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

  return 'Ha ocurrido un error inesperado cargando incidencias.';
};

const fetchStationIncidents = async (stationId: string) => {
  const response = await apiFetch<ApiEnvelope<Incident[]>>(
    `/incidents?stationId=${encodeURIComponent(stationId)}&status=open`
  );
  return response.data;
};

const fetchRecentIncidents = async () => {
  const response = await apiFetch<ApiEnvelope<Incident[]>>('/incidents?limit=100');
  return response.data;
};

const createIncident = async (input: CreateIncidentInput) => {
  const response = await apiFetch<ApiEnvelope<Incident>>('/incidents', {
    body: JSON.stringify(input),
    method: 'POST'
  });

  return response.data;
};

export const useStationIncidents = (stationId: string | null) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchStationIncidents(stationId as string),
    queryKey: ['station-incidents', sessionCacheKey, stationId],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useRecentIncidents = (enabled = true) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const query = useQuery({
    enabled,
    queryFn: fetchRecentIncidents,
    queryKey: ['incidents-feed', sessionCacheKey],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useCreateIncident = (stationId: string | null) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createIncident,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['station-incidents', sessionCacheKey, stationId] }),
        queryClient.invalidateQueries({ queryKey: ['incidents-feed', sessionCacheKey] }),
        queryClient.invalidateQueries({ queryKey: ['change-logs'] })
      ]);
    }
  });

  return {
    createIncident: mutation.mutateAsync,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    isCreating: mutation.isPending
  };
};
