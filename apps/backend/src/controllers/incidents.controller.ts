import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendSuccess } from '../lib/api-response.js';
import { createIncident, listIncidents } from '../models/incidents.model.js';
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
      status
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
