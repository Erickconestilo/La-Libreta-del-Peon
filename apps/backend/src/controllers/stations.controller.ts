import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendSuccess } from '../lib/api-response.js';
import { createStation, getStationById, listStations } from '../models/stations.model.js';
import { validateCreateStationInput } from '../utils/station-validation.js';

export const listStationsController = async (request: Request, response: Response) => {
  try {
    const projectId = typeof request.query.projectId === 'string' ? request.query.projectId : null;
    const stations = await listStations(projectId);

    sendSuccess(response, stations);
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'STATIONS_LIST_FAILED',
        message: 'Unable to load stations'
      }
    });
  }
};

export const getStationByIdController = async (request: Request, response: Response) => {
  try {
    const stationId = Array.isArray(request.params.stationId)
      ? request.params.stationId[0]
      : request.params.stationId;
    const station = await getStationById(stationId);

    if (!station) {
      throw new AppError('Station not found', 404, 'STATION_NOT_FOUND');
    }

    sendSuccess(response, station);
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
        code: 'STATION_DETAIL_FAILED',
        message: 'Unable to load station'
      }
    });
  }
};

export const createStationController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const input = validateCreateStationInput(request.body);
    const stationId = await createStation(input, request.user.id);
    const station = await getStationById(stationId);

    sendSuccess(response, station, 201);
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
        code: 'STATION_CREATE_FAILED',
        message: 'Unable to create station'
      }
    });
  }
};
