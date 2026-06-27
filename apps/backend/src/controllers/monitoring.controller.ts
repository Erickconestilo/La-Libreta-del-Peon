import type { Request, Response } from 'express';

import { assertProjectAccess, getActorProjectScope } from '../lib/access-control.js';
import { AppError } from '../lib/app-error.js';
import { sendSuccess } from '../lib/api-response.js';
import { parseProjectCodeCatalogCsv } from '../lib/project-code-catalog-csv.js';
import {
  createInstrumentReading,
  createMonitoringRoundPoint,
  importProjectCodeCatalog,
  listProjectCodeCatalog
} from '../models/monitoring.model.js';
import {
  validateCodeCatalogQuery,
  validateCreateInstrumentReadingInput,
  validateCreateRoundPointInput
} from '../utils/monitoring-validation.js';

const sendControllerError = (response: Response, error: unknown, fallbackCode: string, fallbackMessage: string) => {
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

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    response.status(409).json({
      data: null,
      error: {
        code: 'DUPLICATE_MONITORING_RECORD',
        message: 'Monitoring record already exists'
      }
    });
    return;
  }

  response.status(500).json({
    data: null,
    error: {
      code: fallbackCode,
      message: fallbackMessage
    }
  });
};

export const createRoundPointController = async (request: Request, response: Response) => {
  try {
    const roundId = Array.isArray(request.params.roundId) ? request.params.roundId[0] : request.params.roundId;
    const input = validateCreateRoundPointInput(request.body);
    const roundPoint = await createMonitoringRoundPoint(roundId, input, getActorProjectScope(request.user));

    if (!roundPoint) {
      throw new AppError('Round or control point not found', 404, 'ROUND_POINT_TARGET_NOT_FOUND');
    }

    sendSuccess(response, roundPoint, 201);
  } catch (error) {
    sendControllerError(response, error, 'ROUND_POINT_CREATE_FAILED', 'Unable to create round point');
  }
};

export const createInstrumentReadingController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const roundPointId = Array.isArray(request.params.roundPointId)
      ? request.params.roundPointId[0]
      : request.params.roundPointId;
    const input = validateCreateInstrumentReadingInput(request.body);
    const result = await createInstrumentReading(
      roundPointId,
      input,
      request.user.id,
      getActorProjectScope(request.user)
    );

    if (!result) {
      throw new AppError('Round point not found', 404, 'ROUND_POINT_NOT_FOUND');
    }

    sendSuccess(
      response,
      {
        autoConfirmed: result.autoConfirmed,
        delta: result.delta,
        reading: result.reading,
        thresholdStatus: result.thresholdStatus
      },
      result.created ? 201 : 200
    );
  } catch (error) {
    sendControllerError(response, error, 'READING_CREATE_FAILED', 'Unable to create instrument reading');
  }
};

export const listProjectCodeCatalogController = async (request: Request, response: Response) => {
  try {
    const projectId = Array.isArray(request.params.projectId)
      ? request.params.projectId[0]
      : request.params.projectId;

    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    assertProjectAccess(request.user, projectId);

    const query = validateCodeCatalogQuery(request.query);
    const rows = await listProjectCodeCatalog(projectId, query, getActorProjectScope(request.user));

    sendSuccess(response, rows);
  } catch (error) {
    sendControllerError(response, error, 'CODE_CATALOG_LIST_FAILED', 'Unable to load project code catalog');
  }
};

export const importProjectCodeCatalogController = async (request: Request, response: Response) => {
  try {
    const projectId = Array.isArray(request.params.projectId)
      ? request.params.projectId[0]
      : request.params.projectId;
    const csv = typeof request.body === 'string' ? request.body : '';

    if (!csv.trim()) {
      throw new AppError('CSV body is required', 400, 'CSV_BODY_REQUIRED');
    }

    const rows = parseProjectCodeCatalogCsv(csv);
    const result = await importProjectCodeCatalog(projectId, rows);

    if (!result) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    sendSuccess(response, result, 201);
  } catch (error) {
    sendControllerError(response, error, 'CODE_CATALOG_IMPORT_FAILED', 'Unable to import project code catalog');
  }
};
