import type { AuthenticatedUser } from '../types/express.js';

type JsonObject = Record<string, unknown>;

const omitFields = <T extends JsonObject>(value: T, fields: string[]) => {
  const publicValue: JsonObject = { ...value };

  for (const field of fields) {
    delete publicValue[field];
  }

  return publicValue;
};

export const shouldUsePublicDto = (user: AuthenticatedUser | undefined | null) => {
  return user?.role === 'visitante';
};

export const toPublicStation = <T extends JsonObject>(station: T) => {
  return omitFields(station, ['createdBy']);
};

export const toPublicStationPhoto = <T extends JsonObject>(photo: T) => {
  return omitFields(photo, ['storagePath', 'uploadedBy']);
};

export const toPublicGuideEntry = <T extends JsonObject>(entry: T) => {
  return omitFields(entry, ['createdBy', 'updatedBy']);
};

export const toPublicPrism = <T extends JsonObject>(prism: T) => {
  return omitFields(prism, ['createdBy', 'sourceFiles']);
};

export const toPublicPrismObservation = <T extends JsonObject>(observation: T) => {
  return omitFields(observation, ['externalKey', 'sourceFile', 'sourceFormat', 'sourceSystem']);
};

export const toPublicPrismCoverage = <T extends JsonObject>(coverage: T) => {
  const stations = Array.isArray(coverage.stations)
    ? coverage.stations.map((station) => omitFields(station as JsonObject, ['sourceFiles']))
    : coverage.stations;

  return {
    ...coverage,
    stations
  };
};
