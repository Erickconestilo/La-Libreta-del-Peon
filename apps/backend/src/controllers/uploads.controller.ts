import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { createSignedPhotoUpload, createStationPhotoStoragePath } from '../lib/photo-storage.js';
import { sendSuccess } from '../lib/api-response.js';
import { getStationById } from '../models/stations.model.js';
import { MAX_PHOTO_UPLOAD_BYTES, validateSignedPhotoUploadInput } from '../utils/photo-validation.js';

export const createSignedPhotoUploadController = async (request: Request, response: Response) => {
  try {
    const input = validateSignedPhotoUploadInput(request.body);

    const station = await getStationById(input.entityId);

    if (!station) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    const storagePath = createStationPhotoStoragePath(input.entityId, input.contentType);
    const signedUpload = await createSignedPhotoUpload(storagePath);

    sendSuccess(response, {
      ...signedUpload,
      contentType: input.contentType,
      maxSizeBytes: MAX_PHOTO_UPLOAD_BYTES
    }, 201);
  } catch (error) {
    if (error instanceof AppError) {
      response.status(error.statusCode).json({
        data: null,
        error: {
          code: error.code,
          details: error.details,
          message: error.message
        }
      });
      return;
    }

    response.status(500).json({
      data: null,
      error: {
        code: 'PHOTO_UPLOAD_SIGN_FAILED',
        message: 'Unable to prepare photo upload'
      }
    });
  }
};
