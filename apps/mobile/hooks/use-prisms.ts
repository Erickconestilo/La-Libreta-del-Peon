import { useQuery } from '@tanstack/react-query';

import type { Prism, PrismCoverageGroup, PrismObservation } from '@shared/types';

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

export type StationPrismListItem = Prism & {
  observationCount: number;
  stationFirstObservedAt: string | null;
  stationLastObservedAt: string | null;
};

export type StationPrismObservation = PrismObservation & {
  prismCode: string;
};

type StationPrismsResponse = {
  observations: StationPrismObservation[];
  prisms: StationPrismListItem[];
  stationId: string;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Ha ocurrido un error inesperado cargando prismas.';
};

const fetchStationPrisms = async (stationId: string) => {
  const response = await apiFetch<ApiEnvelope<StationPrismsResponse>>(`/stations/${stationId}/prisms`);
  return response.data;
};

const fetchPrismCoverage = async (groupCode: string) => {
  const response = await apiFetch<ApiEnvelope<PrismCoverageGroup>>(`/prisms/coverage/${encodeURIComponent(groupCode)}`);
  return response.data;
};

export const useStationPrisms = (stationId: string | null) => {
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchStationPrisms(stationId as string),
    queryKey: ['station-prisms', stationId],
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null,
  };
};

export const usePrismCoverage = (groupCode: string | null) => {
  const query = useQuery({
    enabled: Boolean(groupCode),
    queryFn: () => fetchPrismCoverage(groupCode as string),
    queryKey: ['prism-coverage', groupCode],
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null,
  };
};
