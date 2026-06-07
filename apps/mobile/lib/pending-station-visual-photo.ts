import { Storage } from 'expo-sqlite/kv-store';

import type { StationPhotoKind } from '@shared/types';

import type { PhotoSource } from '@/lib/photo-upload';

const PENDING_STATION_VISUAL_PHOTO_KEY = 'topofield:pending-station-visual-photo';

export type PendingStationVisualPhoto = {
  isPrimary: boolean;
  kind: StationPhotoKind;
  notes: string | null;
  returnPath: string;
  source: PhotoSource;
  stationId: string;
  title: string | null;
};

const isPhotoSource = (value: unknown): value is PhotoSource => value === 'camera' || value === 'library';

const isStationPhotoKind = (value: unknown): value is StationPhotoKind => {
  return typeof value === 'string' && ['general', 'point', 'reference', 'access', 'obstacle', 'other'].includes(value);
};

const parsePendingStationVisualPhoto = (rawValue: string | null): PendingStationVisualPhoto | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<Record<keyof PendingStationVisualPhoto, unknown>>;

    if (
      typeof parsed.stationId !== 'string' ||
      typeof parsed.returnPath !== 'string' ||
      !isPhotoSource(parsed.source) ||
      !isStationPhotoKind(parsed.kind)
    ) {
      return null;
    }

    return {
      isPrimary: parsed.isPrimary === true,
      kind: parsed.kind,
      notes: typeof parsed.notes === 'string' && parsed.notes.trim().length > 0 ? parsed.notes : null,
      returnPath: parsed.returnPath,
      source: parsed.source,
      stationId: parsed.stationId,
      title: typeof parsed.title === 'string' && parsed.title.trim().length > 0 ? parsed.title : null
    };
  } catch {
    return null;
  }
};

export const getPendingStationVisualPhoto = async () => {
  const rawValue = await Storage.getItem(PENDING_STATION_VISUAL_PHOTO_KEY);
  return parsePendingStationVisualPhoto(rawValue);
};

export const setPendingStationVisualPhoto = async (value: PendingStationVisualPhoto) => {
  await Storage.setItem(PENDING_STATION_VISUAL_PHOTO_KEY, JSON.stringify(value));
};

export const clearPendingStationVisualPhoto = async () => {
  await Storage.removeItem(PENDING_STATION_VISUAL_PHOTO_KEY);
};
