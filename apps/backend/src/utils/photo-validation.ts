import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

export const PHOTO_BUCKET = process.env.SUPABASE_PHOTO_BUCKET ?? 'topofield-photos';
export const MAX_PHOTO_UPLOAD_BYTES = Number.parseInt(
  process.env.MAX_PHOTO_UPLOAD_BYTES ?? String(5 * 1024 * 1024),
  10
);

const allowedPhotoContentTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

const signedPhotoUploadSchema = z.object({
  contentType: z.enum(allowedPhotoContentTypes),
  entityId: z.string().uuid(),
  entityType: z.enum(['station']),
  fileSizeBytes: z.number().int().positive().max(MAX_PHOTO_UPLOAD_BYTES)
});

const attachStationPhotoSchema = z.object({
  storagePath: z.string().trim().min(1).max(500).nullable()
});

const createStationPhotoSchema = z.object({
  isPrimary: z.boolean().optional().default(false),
  kind: z.enum(['general', 'point', 'reference', 'access', 'obstacle', 'other']).default('general'),
  notes: z.string().trim().max(1000).nullable().optional(),
  storagePath: z.string().trim().min(1).max(500),
  title: z.string().trim().max(120).nullable().optional()
});

export type SignedPhotoUploadInput = z.infer<typeof signedPhotoUploadSchema>;
export type AttachStationPhotoInput = z.infer<typeof attachStationPhotoSchema>;
export type CreateStationPhotoInput = z.infer<typeof createStationPhotoSchema>;
export type PhotoContentType = (typeof allowedPhotoContentTypes)[number];

export const validateSignedPhotoUploadInput = (input: unknown) => {
  const parsedInput = signedPhotoUploadSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid photo upload payload', 400, 'INVALID_PHOTO_UPLOAD_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateAttachStationPhotoInput = (input: unknown) => {
  const parsedInput = attachStationPhotoSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid station photo payload', 400, 'INVALID_STATION_PHOTO_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateCreateStationPhotoInput = (input: unknown) => {
  const parsedInput = createStationPhotoSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid station visual memory payload', 400, 'INVALID_STATION_PHOTO_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const getPhotoExtension = (contentType: PhotoContentType) => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
};

export const isValidStationPhotoPath = (stationId: string, storagePath: string) => {
  const escapedStationId = stationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^stations/${escapedStationId}/[0-9a-f-]+\\.(jpg|jpeg|png|webp)$`, 'i');

  return pattern.test(storagePath);
};
