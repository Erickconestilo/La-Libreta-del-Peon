import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendSuccess } from '../lib/api-response.js';
import {
  getPrismCoverageByGroupCode,
  listPrismObservationsByStationId,
  listPrismsByStationId,
  reconcilePrismObservationsForExistingStations
} from '../models/prisms.model.js';

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

export const listStationPrismsController = async (request: Request, response: Response) => {
  try {
    const stationId = Array.isArray(request.params.stationId)
      ? request.params.stationId[0]
      : request.params.stationId;

    if (!stationId) {
      throw new AppError('Station id is required', 400, 'STATION_ID_REQUIRED');
    }

    const observationsLimit = parseLimit(request.query.observationsLimit, 200, 500);

    const [prisms, observations] = await Promise.all([
      listPrismsByStationId(stationId),
      listPrismObservationsByStationId(stationId, observationsLimit)
    ]);

    sendSuccess(response, {
      observations,
      prisms,
      stationId
    }, 200, {
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

    const coverage = await getPrismCoverageByGroupCode(groupCode);

    sendSuccess(response, coverage);
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
