import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getActorProjectScope } from '../lib/access-control.js';
import { shouldUsePublicDto, toPublicStationPhoto } from '../lib/public-dto.js';
import { sendSuccess } from '../lib/api-response.js';
import { createStationPhoto, deleteStationPhoto, listStationPhotos } from '../models/station-photos.model.js';
import { isValidStationPhotoPath, validateCreateStationPhotoInput } from '../utils/photo-validation.js';

const getParam = (value: string | string[] | undefined) => {
  return Array.isArray(value) ? value[0] : value;
};

const parseLimit = (value: unknown) => {
  if (typeof value !== 'string') {
    return 50;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(Math.max(parsed, 1), 100);
};

export const listStationPhotosController = async (request: Request, response: Response) => {
  try {
    const stationId = getParam(request.params.stationId);

    if (!stationId) {
      throw new AppError('Station id is required', 400, 'STATION_ID_REQUIRED');
    }

    const limit = parseLimit(request.query.limit);
    const projectScope = getActorProjectScope(request.user);
    const photos = await listStationPhotos(stationId, limit, projectScope);
    const payload = shouldUsePublicDto(request.user)
      ? photos.map(toPublicStationPhoto)
      : photos;

    sendSuccess(response, payload, 200, {
      limit
    });
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
        code: 'STATION_PHOTOS_LIST_FAILED',
        message: 'Unable to load station photos'
      }
    });
  }
};

export const createStationPhotoController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const stationId = getParam(request.params.stationId);

    if (!stationId) {
      throw new AppError('Station id is required', 400, 'STATION_ID_REQUIRED');
    }

    const input = validateCreateStationPhotoInput(request.body);
    const projectScope = getActorProjectScope(request.user);

    if (!isValidStationPhotoPath(stationId, input.storagePath)) {
      throw new AppError('Invalid station photo path', 400, 'INVALID_STATION_PHOTO_PATH');
    }

    const photo = await createStationPhoto(stationId, input, request.user.id, projectScope);

    if (!photo) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    sendSuccess(response, photo, 201);
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
        code: 'STATION_PHOTO_CREATE_FAILED',
        message: 'Unable to create station photo'
      }
    });
  }
};

export const deleteStationPhotoController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const stationId = getParam(request.params.stationId);
    const stationPhotoId = getParam(request.params.stationPhotoId);

    if (!stationId || !stationPhotoId) {
      throw new AppError('Station id and photo id are required', 400, 'STATION_PHOTO_ID_REQUIRED');
    }

    const projectScope = getActorProjectScope(request.user);
    const deleted = await deleteStationPhoto(stationId, stationPhotoId, request.user.id, projectScope);

    if (!deleted) {
      throw new AppError('Station photo not found', 404, 'STATION_PHOTO_NOT_FOUND');
    }

    sendSuccess(response, {
      deleted: true,
      id: stationPhotoId
    });
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
        code: 'STATION_PHOTO_DELETE_FAILED',
        message: 'Unable to delete station photo'
      }
    });
  }
};
