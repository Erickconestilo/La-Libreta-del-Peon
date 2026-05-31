import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getActorProjectScope } from '../lib/access-control.js';
import {
  shouldUsePublicDto,
  toPublicPrism,
  toPublicPrismCoverage,
  toPublicPrismObservation
} from '../lib/public-dto.js';
import { sendSuccess } from '../lib/api-response.js';
import {
  getPrismCoverageByGroupCode,
  listPrismObservationsByStationId,
  listPrismsByStationId,
  reconcilePrismObservationsForExistingStations,
  updatePrismPhoto
} from '../models/prisms.model.js';
import { getStationById } from '../models/stations.model.js';
import { isValidPrismPhotoPath, validateAttachPrismPhotoInput } from '../utils/photo-validation.js';

const parseLimit = (value: unknown, defaultLimit: number, maxLimit: number) => {
  if (typeof value !== 'string') {
    return defaultLimit;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return defaultLimit;
  }

  return Math.min(Math.max(parsed, 1), maxLimit);
};

const normalizeCoverageGroupCode = (value: string) => {
  const groupCode = value.trim();

  if (!/^[a-z0-9][a-z0-9_-]{0,39}$/i.test(groupCode)) {
    throw new AppError('Invalid coverage group code', 400, 'INVALID_COVERAGE_GROUP');
  }

  return groupCode;
};

export const listStationPrismsController = async (request: Request, response: Response) => {
  try {
    const stationId = Array.isArray(request.params.stationId)
      ? request.params.stationId[0]
      : request.params.stationId;

    if (!stationId) {
      throw new AppError('Station id is required', 400, 'STATION_ID_REQUIRED');
    }

    const observationsLimit = parseLimit(request.query.observationsLimit, 200, 500);
    const projectScope = getActorProjectScope(request.user);
    const station = await getStationById(stationId, projectScope);

    if (!station) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    const [prisms, observations] = await Promise.all([
      listPrismsByStationId(stationId, projectScope),
      listPrismObservationsByStationId(stationId, observationsLimit, projectScope)
    ]);
    const payload = shouldUsePublicDto(request.user)
      ? {
          observations: observations.map(toPublicPrismObservation),
          prisms: prisms.map(toPublicPrism),
          stationId
        }
      : {
          observations,
          prisms,
          stationId
        };

    sendSuccess(response, payload, 200, {
      observationsLimit
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
        code: 'STATION_PRISMS_LIST_FAILED',
        message: 'Unable to load station prisms'
      }
    });
  }
};

export const getPrismCoverageController = async (request: Request, response: Response) => {
  try {
    const groupCode = Array.isArray(request.params.groupCode)
      ? request.params.groupCode[0]
      : request.params.groupCode;

    if (!groupCode) {
      throw new AppError('Coverage group code is required', 400, 'COVERAGE_GROUP_REQUIRED');
    }

    const projectScope = getActorProjectScope(request.user);
    const coverage = await getPrismCoverageByGroupCode(normalizeCoverageGroupCode(groupCode), projectScope);

    sendSuccess(response, shouldUsePublicDto(request.user) ? toPublicPrismCoverage(coverage) : coverage);
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
        code: 'PRISM_COVERAGE_FAILED',
        message: 'Unable to load prism coverage'
      }
    });
  }
};

export const updatePrismPhotoController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const prismId = Array.isArray(request.params.prismId)
      ? request.params.prismId[0]
      : request.params.prismId;

    if (!prismId) {
      throw new AppError('Prism id is required', 400, 'PRISM_ID_REQUIRED');
    }

    const input = validateAttachPrismPhotoInput(request.body);
    const projectScope = getActorProjectScope(request.user);

    if (input.storagePath && !isValidPrismPhotoPath(prismId, input.storagePath)) {
      throw new AppError('Invalid prism photo path', 400, 'INVALID_PRISM_PHOTO_PATH');
    }

    const prism = await updatePrismPhoto(prismId, input.storagePath, request.user.id, projectScope);

    if (!prism) {
      throw new AppError('Prism not found', 404, 'PRISM_NOT_FOUND');
    }

    sendSuccess(response, prism);
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
        code: 'PRISM_PHOTO_UPDATE_FAILED',
        message: 'Unable to update prism photo'
      }
    });
  }
};

export const reconcilePrismObservationsController = async (_request: Request, response: Response) => {
  try {
    const summary = await reconcilePrismObservationsForExistingStations();

    sendSuccess(response, summary);
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'PRISM_OBSERVATION_RECONCILE_FAILED',
        message: 'Unable to reconcile prism observations'
      }
    });
  }
};
