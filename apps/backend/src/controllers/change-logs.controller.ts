import type { Request, Response } from 'express';

import { sendSuccess } from '../lib/api-response.js';
import { listChangeLogs } from '../models/change-logs.model.js';
import type { ChangeLogEntityType } from '../models/change-logs.model.js';

const isEntityType = (value: unknown): value is ChangeLogEntityType => {
  return value === 'station' || value === 'prism' || value === 'guide_entry';
};

const parseLimit = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const listChangeLogsController = async (request: Request, response: Response) => {
  try {
    const entityType = isEntityType(request.query.entityType) ? request.query.entityType : null;
    const entityId = typeof request.query.entityId === 'string' ? request.query.entityId : null;
    const changedBy = typeof request.query.changedBy === 'string' ? request.query.changedBy : null;
    const limit = parseLimit(request.query.limit);

    const changeLogs = await listChangeLogs({
      changedBy,
      entityId,
      entityType,
      limit
    });

    sendSuccess(response, changeLogs, 200, {
      limit: Math.min(Math.max(limit ?? 50, 1), 100)
    });
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'CHANGE_LOGS_LIST_FAILED',
        message: 'Unable to load change logs'
      }
    });
  }
};
