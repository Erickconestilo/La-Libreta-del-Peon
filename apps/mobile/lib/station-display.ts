import type { Station } from '@shared/types';

export const getStationDisplayName = (station: Pick<Station, 'externalId' | 'name'>) => {
  if (
    station.externalId === 'trimble-station-002' ||
    station.name.trim().toLowerCase() === 'estacionamiento norte sarria'
  ) {
    return 'Estacionamiento Norte Sarria E02';
  }

  return station.name;
};
