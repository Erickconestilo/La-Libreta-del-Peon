import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useCurrentSession, getSessionCacheKey } from '@/hooks/use-auth';
import { apiFetch, isApiRequestError } from '@/lib/api';
import { createRandomId } from '@/lib/random-id';
import { getWeeklyWorkCache, saveWeeklyWorkCache } from '@/lib/offline/weekly-work-cache';
import type {
  WeeklyWorkCategory,
  WeeklyWorkItem,
  WeeklyWorkStatus
} from '@/lib/weekly-work';

type ApiEnvelope<T> = {
  data: T;
  error: null | { code?: string; message: string };
};

export type CreateWeeklyWorkItemInput = {
  category: WeeklyWorkCategory;
  clientRequestId?: string;
  notes: string | null;
  status?: WeeklyWorkStatus;
  title: string;
  workDate: string;
};

export type UpdateWeeklyWorkItemInput = Partial<CreateWeeklyWorkItemInput> & {
  version: number;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isApiRequestError(error)) {
    if (error.code === 'WEEKLY_WORK_VERSION_CONFLICT') {
      return 'Este trabajo cambió desde que abriste la semana. Se ha actualizado la planificación; revisa el dato antes de repetir la acción.';
    }
    if (error.code === 'WEEKLY_WORK_DELETE_NOT_ALLOWED') {
      return 'Este trabajo ya tiene actividad y no se puede borrar. Puedes editarlo o devolverlo a pendiente cuando corresponda.';
    }
  }
  return error instanceof Error ? error.message : fallback;
};

const fetchWeeklyWork = async (projectId: string, weekStart: string) => {
  const response = await apiFetch<ApiEnvelope<WeeklyWorkItem[]>>(
    `/projects/${projectId}/weekly-work?weekStart=${encodeURIComponent(weekStart)}`
  );
  return response.data;
};

const fetchWeeklyWorkWithCache = async (cacheKey: string, projectId: string, weekStart: string) => {
  try {
    const items = await fetchWeeklyWork(projectId, weekStart);
    saveWeeklyWorkCache(cacheKey, projectId, weekStart, items);
    return { cachedAt: null, isOfflineCache: false, items };
  } catch (error) {
    const cached = getWeeklyWorkCache(cacheKey, projectId, weekStart);
    if (!cached) throw error;
    return { cachedAt: cached.cachedAt, isOfflineCache: true, items: cached.items };
  }
};

const createWeeklyWork = async (projectId: string, input: CreateWeeklyWorkItemInput) => {
  const { clientRequestId = createRandomId(), ...payload } = input;
  const response = await apiFetch<ApiEnvelope<WeeklyWorkItem>>(`/projects/${projectId}/weekly-work`, {
    body: JSON.stringify({ ...payload, clientRequestId }),
    method: 'POST'
  });
  return response.data;
};

const updateWeeklyWork = async (projectId: string, itemId: string, input: UpdateWeeklyWorkItemInput) => {
  const response = await apiFetch<ApiEnvelope<WeeklyWorkItem>>(`/projects/${projectId}/weekly-work/${itemId}`, {
    body: JSON.stringify(input),
    method: 'PATCH'
  });
  return response.data;
};

const deleteWeeklyWork = async (projectId: string, itemId: string, version: number) => {
  await apiFetch<ApiEnvelope<unknown>>(
    `/projects/${projectId}/weekly-work/${itemId}?version=${encodeURIComponent(String(version))}`,
    { method: 'DELETE' }
  );
};

export const useWeeklyWork = (projectId: string | null, weekStart: string) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const query = useQuery({
    enabled: Boolean(projectId && activeSessionId),
    queryFn: () => fetchWeeklyWorkWithCache(sessionCacheKey, projectId as string, weekStart),
    queryKey: ['weekly-work', sessionCacheKey, projectId, weekStart],
    staleTime: 1000 * 15
  });

  return {
    ...query,
    cachedAt: query.data?.cachedAt ?? null,
    data: query.data?.items ?? [],
    errorMessage: query.error ? getErrorMessage(query.error, 'No se pudo cargar la planificación semanal.') : null,
    isOfflineCache: query.data?.isOfflineCache ?? false
  };
};

export const useWeeklyWorkMutations = (projectId: string | null) => {
  const { activeSessionId } = useCurrentSession();
  const sessionCacheKey = getSessionCacheKey(activeSessionId);
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['weekly-work', sessionCacheKey, projectId] });
  };

  const createMutation = useMutation({
    mutationFn: async (input: CreateWeeklyWorkItemInput) => {
      if (!projectId) throw new Error('Selecciona una obra antes de añadir trabajo.');
      return createWeeklyWork(projectId, input);
    },
    onSuccess: invalidate
  });

  const updateMutation = useMutation({
    mutationFn: ({ input, itemId }: { input: UpdateWeeklyWorkItemInput; itemId: string }) => {
      if (!projectId) throw new Error('Selecciona una obra antes de actualizar el trabajo.');
      return updateWeeklyWork(projectId, itemId, input);
    },
    onError: async (error) => {
      if (isApiRequestError(error) && error.code === 'WEEKLY_WORK_VERSION_CONFLICT') {
        await invalidate();
      }
    },
    onSuccess: invalidate
  });

  const deleteMutation = useMutation({
    mutationFn: ({ itemId, version }: { itemId: string; version: number }) => {
      if (!projectId) throw new Error('Selecciona una obra antes de eliminar el trabajo.');
      return deleteWeeklyWork(projectId, itemId, version);
    },
    onError: async (error) => {
      if (isApiRequestError(error) && (
        error.code === 'WEEKLY_WORK_VERSION_CONFLICT' ||
        error.code === 'WEEKLY_WORK_DELETE_NOT_ALLOWED'
      )) {
        await invalidate();
      }
    },
    onSuccess: invalidate
  });

  return {
    createItem: createMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    errorMessage:
      (createMutation.error && getErrorMessage(createMutation.error, 'No se pudo añadir el trabajo.')) ||
      (updateMutation.error && getErrorMessage(updateMutation.error, 'No se pudo actualizar el trabajo.')) ||
      (deleteMutation.error && getErrorMessage(deleteMutation.error, 'No se pudo eliminar el trabajo.')) ||
      null,
    isSaving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    updateItem: updateMutation.mutateAsync
  };
};
