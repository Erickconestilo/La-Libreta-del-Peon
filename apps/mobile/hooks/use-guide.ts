import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { GuideEntry } from '@shared/types';

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

  return 'Ha ocurrido un error inesperado cargando la guía.';
};

const fetchGuideEntries = async (category?: string | null) => {
  const searchParams = new URLSearchParams();

  if (category) {
    searchParams.set('category', category);
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
  const response = await apiFetch<ApiEnvelope<GuideEntry[]>>(`/guide-entries${suffix}`);
  return response.data;
};

const fetchGuideEntry = async (guideEntryId: string) => {
  const response = await apiFetch<ApiEnvelope<GuideEntry>>(`/guide-entries/${guideEntryId}`);

  return response.data;
};

const createGuideEntry = async (input: Pick<GuideEntry, 'body' | 'category' | 'title'>) => {
  const response = await apiFetch<ApiEnvelope<GuideEntry>>('/guide-entries', {
    body: JSON.stringify(input),
    method: 'POST'
  });

  return response.data;
};

const updateGuideEntry = async ({
  guideEntryId,
  input
}: {
  guideEntryId: string;
  input: Partial<Pick<GuideEntry, 'body' | 'category' | 'title'>>;
}) => {
  const response = await apiFetch<ApiEnvelope<GuideEntry>>(`/guide-entries/${guideEntryId}`, {
    body: JSON.stringify(input),
    method: 'PATCH'
  });

  return response.data;
};

const deleteGuideEntry = async (guideEntryId: string) => {
  const response = await apiFetch<ApiEnvelope<{ deleted: boolean; id: string }>>(`/guide-entries/${guideEntryId}`, {
    method: 'DELETE'
  });

  return response.data;
};

export const useGuideEntries = (category?: string | null) => {
  const query = useQuery({
    queryFn: () => fetchGuideEntries(category ?? null),
    queryKey: ['guide-entries', category ?? null],
    staleTime: 1000 * 60 * 5
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useGuideEntry = (guideEntryId?: string | null) => {
  const query = useQuery({
    enabled: Boolean(guideEntryId),
    queryFn: () => fetchGuideEntry(guideEntryId as string),
    queryKey: ['guide-entry', guideEntryId ?? null],
    staleTime: 1000 * 60 * 10
  });

  return {
    ...query,
    data: query.data ?? null,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useGuideEntryMutations = () => {
  const queryClient = useQueryClient();

  const invalidateGuideEntries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['guide-entries']
    });
  };

  const createMutation = useMutation({
    mutationFn: createGuideEntry,
    onSuccess: invalidateGuideEntries
  });

  const updateMutation = useMutation({
    mutationFn: updateGuideEntry,
    onSuccess: invalidateGuideEntries
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGuideEntry,
    onSuccess: invalidateGuideEntries
  });

  return {
    createGuideEntry: createMutation.mutateAsync,
    deleteGuideEntry: deleteMutation.mutateAsync,
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    mutationError:
      createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? null,
    updateGuideEntry: updateMutation.mutateAsync
  };
};
