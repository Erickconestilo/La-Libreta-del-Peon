import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REQUEST_LOG_FORMAT = ':request-id :method :url :status';

const isUuid = (value: string | undefined): value is string => Boolean(value && UUID_PATTERN.test(value));

export const requestIdMiddleware: RequestHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const requestedId = request.get('X-Request-ID');
  const requestId = isUuid(requestedId) ? requestedId : randomUUID();

  response.setHeader('X-Request-ID', requestId);
  next();
};
