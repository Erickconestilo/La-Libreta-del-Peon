import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getActorProjectScope } from '../lib/access-control.js';
import {
  createPrismPhotoStoragePath,
  createProjectPhotoStoragePath,
  createReadingPhotoStoragePath,
  createSignedPhotoUpload,
  createStationPhotoStoragePath
} from '../lib/photo-storage.js';
import { getInstrumentReadingById } from '../models/monitoring.model.js';
import { sendSuccess } from '../lib/api-response.js';
import { getPrismById } from '../models/prisms.model.js';
import { getProjectById } from '../models/projects.model.js';
import { getStationById } from '../models/stations.model.js';
import { MAX_PHOTO_UPLOAD_BYTES, validateSignedPhotoUploadInput } from '../utils/photo-validation.js';

export const createSignedPhotoUploadController = async (request: Request, response: Response) => {
  try {
    const input = validateSignedPhotoUploadInput(request.body);
    const projectScope = getActorProjectScope(request.user);

    const entity = input.entityType === 'station'
      ? await getStationById(input.entityId, projectScope)
      : input.entityType === 'project'
        ? await getProjectById(input.entityId, projectScope)
        : input.entityType === 'prism'
          ? await getPrismById(input.entityId, projectScope)
          : await getInstrumentReadingById(input.entityId, projectScope);

    if (!entity) {
      const entityLabel = input.entityType === 'station'
        ? 'Station'
        : input.entityType === 'project'
          ? 'Project'
          : input.entityType === 'prism'
            ? 'Prism'
            : 'Reading';

      throw new AppError(
        `${entityLabel} not found`,
        404,
        `${entityLabel.toUpperCase()}_NOT_FOUND`
      );
    }

    const storagePath = input.entityType === 'station'
      ? createStationPhotoStoragePath(input.entityId, input.contentType)
      : input.entityType === 'project'
        ? createProjectPhotoStoragePath(input.entityId, input.contentType)
        : input.entityType === 'prism'
          ? createPrismPhotoStoragePath(input.entityId, input.contentType)
          : createReadingPhotoStoragePath(input.entityId, input.uploadId as string, input.contentType);
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
