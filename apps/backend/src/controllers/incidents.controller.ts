import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { assertProjectWriteAccess, assertTopografoHasScopedResource, getActorProjectScope } from '../lib/access-control.js';
import { sendSuccess } from '../lib/api-response.js';
import { createIncident, listIncidents } from '../models/incidents.model.js';
import { getPrismById } from '../models/prisms.model.js';
import { getStationById } from '../models/stations.model.js';
import { validateCreateIncidentInput } from '../utils/incidents-validation.js';

const parseIncidentStatus = (value: unknown) => {
  return value === 'open' || value === 'resolved' ? value : null;
};

export const listIncidentsController = async (request: Request, response: Response) => {
  try {
    const stationId = typeof request.query.stationId === 'string' ? request.query.stationId : null;
    const limit = typeof request.query.limit === 'string' ? Number(request.query.limit) : 50;
    const status = parseIncidentStatus(request.query.status);
    const incidents = await listIncidents({
      limit: Number.isFinite(limit) ? limit : 50,
      stationId,
      status,
      projectScope: getActorProjectScope(request.user)
    });

    sendSuccess(response, incidents);
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'INCIDENTS_LIST_FAILED',
        message: 'Unable to load incidents'
      }
    });
  }
};

export const createIncidentController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const input = validateCreateIncidentInput(request.body);
    const projectScope = getActorProjectScope(request.user);
    assertTopografoHasScopedResource(request.user, Boolean(input.stationId || input.prismId));
    const scopedResource = input.stationId
      ? await getStationById(input.stationId, projectScope)
      : input.prismId
        ? await getPrismById(input.prismId, projectScope)
        : null;
    if ((input.stationId || input.prismId) && !scopedResource) {
      throw new AppError('Referenced resource not found', 404, 'INCIDENT_RESOURCE_NOT_FOUND');
    }
    assertProjectWriteAccess(request.user, scopedResource?.projectId ?? null);
    const incident = await createIncident(input, request.user.id, projectScope);

    sendSuccess(response, incident, 201);
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
        code: 'INCIDENT_CREATE_FAILED',
        message: 'Unable to create incident'
      }
    });
  }
};
