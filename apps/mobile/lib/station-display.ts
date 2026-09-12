import type { Station } from '@shared/types';

export const getStationDisplayName = (station: Pick<Station, 'externalId' | 'name'>) => {
  if (station.name.trim()) {
    return station.name;
  }

  return station.externalId?.trim() || 'Estación sin nombre';
};
