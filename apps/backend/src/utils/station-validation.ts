import { z } from 'zod';

import { AppError } from '../lib/app-error.js';
import { getMaxReadingSpreadMeters } from './geo.js';

const utmSchema = z.object({
  easting: z.number().nullable(),
  northing: z.number().nullable(),
  zone: z.string().nullable()
});

const stationReadingSchema = z.object({
  source: z.enum(['gps_offline', 'mobile_network']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  utmZone: z.string().nullable().optional(),
  utmEasting: z.number().nullable().optional(),
  utmNorthing: z.number().nullable().optional(),
  elevation: z.number().nullable().optional(),
  accuracy: z.number().nullable().optional(),
  bearing: z.number().nullable().optional(),
  declination: z.number().nullable().optional(),
  speedKmh: z.number().nullable().optional(),
  mapUrl: z.string().url().nullable().optional(),
  capturedOnline: z.boolean(),
  rawPayload: z.record(z.string(), z.unknown()).nullable().optional()
});

export const createStationSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(200),
  deviceType: z.enum(['leica', 'trimble']).nullable().optional(),
  mapStatus: z.enum(['approximate', 'verified', 'resolved']).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  utmZone: z.string().nullable().optional(),
  utmEasting: z.number().nullable().optional(),
  utmNorthing: z.number().nullable().optional(),
  elevation: z.number().nullable().optional(),
  resolvedMethod: z.string().trim().max(100).nullable().optional(),
  displayMode: z.string().trim().max(100).nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum(['active', 'replaced', 'incident']).default('active'),
  readings: z.array(stationReadingSchema).default([])
});

export type CreateStationInput = z.infer<typeof createStationSchema>;

export const validateCreateStationInput = (input: unknown) => {
  const parsedInput = createStationSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid station payload', 400, 'INVALID_STATION_PAYLOAD', parsedInput.error.flatten());
  }

  const readingCoordinates = parsedInput.data.readings.map((reading) => ({
    lat: reading.lat,
    lng: reading.lng
  }));

  if (readingCoordinates.length >= 2) {
    const maxSpreadMeters = getMaxReadingSpreadMeters(readingCoordinates);

    if (maxSpreadMeters > 30) {
      throw new AppError(
        'Station readings look inconsistent and are too far apart',
        422,
        'SUSPICIOUS_READING_SPREAD',
        {
          maxSpreadMeters
        }
      );
    }
  }

  return parsedInput.data;
};
