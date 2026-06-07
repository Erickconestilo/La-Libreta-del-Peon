import { useQuery } from '@tanstack/react-query';

import type { ChangeLog, EntityType } from '@shared/types';

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

interface UseChangeLogsOptions {
  enabled?: boolean;
  entityId?: string | null;
  entityType?: EntityType | null;
  limit?: number;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ha ocurrido un error inesperado cargando el historial.';
};

const fetchChangeLogs = async ({ entityId, entityType, limit = 50 }: UseChangeLogsOptions) => {
  const searchParams = new URLSearchParams();
  searchParams.set('limit', String(limit));

  if (entityType) {
    searchParams.set('entityType', entityType);
  }

  if (entityId) {
    searchParams.set('entityId', entityId);
  }

  const response = await apiFetch<ApiEnvelope<ChangeLog[]>>(`/change-logs?${searchParams.toString()}`);

  return response.data;
};

export const useChangeLogs = (options: UseChangeLogsOptions = {}) => {
  const query = useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => fetchChangeLogs(options),
    queryKey: ['change-logs', options.entityType ?? null, options.entityId ?? null, options.limit ?? 50],
    staleTime: 1000 * 30
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};
