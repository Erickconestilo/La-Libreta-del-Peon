import type { Request, Response } from 'express';

import { assertProjectWriteAccess, getActorProjectScope } from '../lib/access-control.js';
import { AppError } from '../lib/app-error.js';
import { assertPhotoObjectExists } from '../lib/photo-storage.js';
import { sendSuccess } from '../lib/api-response.js';
import { getStationById } from '../models/stations.model.js';
import {
  createMountingEvidence,
  createMountingVisit,
  getMountingVisitById,
  listMountingVisits
} from '../models/mounting-visits.model.js';
import { validateCreateMountingEvidenceInput, validateCreateMountingVisitInput } from '../utils/mounting-validation.js';
import { isValidMountingVisitPhotoPath } from '../utils/photo-validation.js';

const routeParam = (request: Request, name: string) => {
  const value = request.params[name];
  return Array.isArray(value) ? value[0] : value;
};

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

  response.status(500).json({
    data: null,
    error: {
      code: fallbackCode,
      message: fallbackMessage
    }
  });
};

export const listMountingVisitsController = async (request: Request, response: Response) => {
  try {
    const stationId = routeParam(request, 'stationId');
    if (!stationId) {
      throw new AppError('Station id is required', 400, 'STATION_ID_REQUIRED');
    }

    const projectScope = getActorProjectScope(request.user);
    const station = await getStationById(stationId, projectScope);
    if (!station) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    sendSuccess(response, await listMountingVisits(stationId, projectScope));
  } catch (error) {
    sendControllerError(response, error, 'MOUNTING_VISITS_LIST_FAILED', 'Unable to load mounting visits');
  }
};

export const createMountingVisitController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const stationId = routeParam(request, 'stationId');
    if (!stationId) {
      throw new AppError('Station id is required', 400, 'STATION_ID_REQUIRED');
    }

    const projectScope = getActorProjectScope(request.user);
    const station = await getStationById(stationId, projectScope);
    if (!station) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }
    if (!station.projectId) {
      throw new AppError('A project-scoped station is required for a mounting visit', 403, 'PROJECT_REQUIRED');
    }
    assertProjectWriteAccess(request.user, station.projectId);

    const visit = await createMountingVisit(
      stationId,
      validateCreateMountingVisitInput(request.body),
      request.user.id,
      projectScope
    );

    if (!visit) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    sendSuccess(response, visit, 201);
  } catch (error) {
    sendControllerError(response, error, 'MOUNTING_VISIT_CREATE_FAILED', 'Unable to create mounting visit');
  }
};

export const createMountingEvidenceController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const stationId = routeParam(request, 'stationId');
    const visitId = routeParam(request, 'visitId');
    if (!stationId || !visitId) {
      throw new AppError('Station id and visit id are required', 400, 'MOUNTING_VISIT_ID_REQUIRED');
    }

    const input = validateCreateMountingEvidenceInput(request.body);
    if (!isValidMountingVisitPhotoPath(visitId, input.storagePath)) {
      throw new AppError('Invalid mounting visit photo path', 400, 'INVALID_MOUNTING_VISIT_PHOTO_PATH');
    }

    const projectScope = getActorProjectScope(request.user);
    const visit = await getMountingVisitById(visitId, projectScope);
    if (!visit || visit.stationId !== stationId) {
      throw new AppError('Mounting visit not found', 404, 'MOUNTING_VISIT_NOT_FOUND');
    }
    assertProjectWriteAccess(request.user, visit.projectId);

    await assertPhotoObjectExists(input.storagePath);
    const evidence = await createMountingEvidence(
      visitId,
      stationId,
      input,
      request.user.id,
      projectScope
    );

    if (!evidence) {
      throw new AppError('Mounting visit or prism not found', 404, 'MOUNTING_EVIDENCE_TARGET_NOT_FOUND');
    }

    sendSuccess(response, evidence, 201);
  } catch (error) {
    sendControllerError(response, error, 'MOUNTING_EVIDENCE_CREATE_FAILED', 'Unable to attach mounting evidence');
  }
};
