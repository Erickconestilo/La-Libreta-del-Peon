import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getActorProjectScope } from '../lib/access-control.js';
import { sendSuccess } from '../lib/api-response.js';
import { createStationMessage, listRecentStationMessages, listStationMessages } from '../models/station-messages.model.js';
import { validateCreateStationMessageInput } from '../utils/station-messages-validation.js';

export const listRecentStationMessagesController = async (request: Request, response: Response) => {
  try {
    const limit = typeof request.query.limit === 'string' ? Number(request.query.limit) : 100;
    const projectScope = getActorProjectScope(request.user);
    const messages = await listRecentStationMessages(Number.isFinite(limit) ? limit : 100, projectScope);

    sendSuccess(response, messages);
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'STATION_MESSAGES_FEED_FAILED',
        message: 'Unable to load station messages feed'
      }
    });
  }
};

export const listStationMessagesController = async (request: Request, response: Response) => {
  try {
    const stationId = Array.isArray(request.params.stationId)
      ? request.params.stationId[0]
      : request.params.stationId;
    const limit = typeof request.query.limit === 'string' ? Number(request.query.limit) : 50;
    const projectScope = getActorProjectScope(request.user);
    const messages = await listStationMessages(stationId, Number.isFinite(limit) ? limit : 50, projectScope);

    sendSuccess(response, messages);
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'STATION_MESSAGES_LIST_FAILED',
        message: 'Unable to load station messages'
      }
    });
  }
};

export const createStationMessageController = async (request: Request, response: Response) => {
  try {
    if (!request.user) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const stationId = Array.isArray(request.params.stationId)
      ? request.params.stationId[0]
      : request.params.stationId;

    if (!stationId) {
      throw new AppError('Station id is required', 400, 'STATION_ID_REQUIRED');
    }

    const input = validateCreateStationMessageInput(request.body);
    const projectScope = getActorProjectScope(request.user);
    const message = await createStationMessage(stationId, input.body, request.user.id, projectScope);

    sendSuccess(response, message, 201);
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
        code: 'STATION_MESSAGE_CREATE_FAILED',
        message: 'Unable to create station message'
      }
    });
  }
};
