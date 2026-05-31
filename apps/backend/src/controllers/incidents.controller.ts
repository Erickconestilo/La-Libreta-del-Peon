import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getActorProjectScope } from '../lib/access-control.js';
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

    const station = input.stationId
      ? await getStationById(input.stationId, projectScope)
      : null;

    if (input.stationId && !station) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    const prism = input.prismId
      ? await getPrismById(input.prismId, projectScope)
      : null;

    if (input.prismId && !prism) {
      throw new AppError('Prism not found', 404, 'PRISM_NOT_FOUND');
    }

    if (station && prism) {
      if (station.projectId && prism.projectId && station.projectId !== prism.projectId) {
        throw new AppError(
          'Station and prism must belong to the same project',
          400,
          'INCIDENT_SCOPE_MISMATCH'
        );
      }
    }

    const incident = await createIncident(input, request.user.id);

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
