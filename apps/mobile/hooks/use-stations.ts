import { useQuery } from '@tanstack/react-query';

import type { Station, StationReading } from '@shared/types';

import { apiFetch } from '@/lib/api';

type StationListItem = Station & {
  project?: {
    code: string;
    name: string;
  } | null;
};

type StationDetail = StationListItem & {
  readings: StationReading[];
};

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

  return 'Ha ocurrido un error inesperado cargando estaciones.';
};

const fetchStations = async () => {
  const response = await apiFetch<ApiEnvelope<StationListItem[]>>('/stations');
  return response.data;
};

const fetchStationDetail = async (stationId: string) => {
  const response = await apiFetch<ApiEnvelope<StationDetail>>(`/stations/${stationId}`);
  return response.data;
};

export const useStations = () => {
  const query = useQuery({
    queryFn: fetchStations,
    queryKey: ['stations'],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};

export const useStationDetail = (stationId: string | null) => {
  const query = useQuery({
    enabled: Boolean(stationId),
    queryFn: () => fetchStationDetail(stationId as string),
    queryKey: ['station-detail', stationId],
    staleTime: 1000 * 60
  });

  return {
    ...query,
    errorMessage: query.error ? getErrorMessage(query.error) : null
  };
};
