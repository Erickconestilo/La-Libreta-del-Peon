import { randomUUID } from 'node:crypto';

import { AppError } from './app-error.js';
import { supabaseAdmin } from './supabase.js';
import {
  getPhotoExtension,
  PHOTO_BUCKET,
  type PhotoContentType
} from '../utils/photo-validation.js';

export const createStationPhotoStoragePath = (stationId: string, contentType: PhotoContentType) => {
  return `stations/${stationId}/${randomUUID()}.${getPhotoExtension(contentType)}`;
};

export const createSignedPhotoUpload = async (storagePath: string) => {
  const { data, error } = await supabaseAdmin.storage
    .from(PHOTO_BUCKET)
    .createSignedUploadUrl(storagePath, {
      upsert: false
    });

  if (error || !data) {
    throw new AppError('Unable to prepare photo upload', 500, 'PHOTO_UPLOAD_SIGN_FAILED');
  }

  const publicUrl = getPublicPhotoUrl(storagePath);

  return {
    bucket: PHOTO_BUCKET,
    path: data.path,
    publicUrl,
    signedUrl: data.signedUrl,
    token: data.token
  };
};

export const getPublicPhotoUrl = (storagePath: string) => {
  const { data } = supabaseAdmin.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
};
