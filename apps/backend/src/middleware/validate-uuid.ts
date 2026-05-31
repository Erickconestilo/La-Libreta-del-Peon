import type { NextFunction, Request, Response } from 'express';

import { sendError } from '../lib/api-response.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: unknown): value is string => {
  return typeof value === 'string' && UUID_PATTERN.test(value);
};

export const validateUuidParam = (paramName: string) => {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!isUuid(request.params[paramName])) {
      sendError(
        response,
        {
          code: 'INVALID_UUID_PARAM',
          details: {
            param: paramName
          },
          message: 'Invalid route parameter'
        },
        400
      );
      return;
    }

    next();
  };
};

export const validateOptionalUuidQuery = (queryName: string) => {
  return (request: Request, response: Response, next: NextFunction) => {
    const value = request.query[queryName];

    if (value === undefined || value === null || value === '') {
      next();
      return;
    }

    if (!isUuid(value)) {
      sendError(
        response,
        {
          code: 'INVALID_UUID_QUERY',
          details: {
            query: queryName
          },
          message: 'Invalid query parameter'
        },
        400
      );
      return;
    }

    next();
  };
};
