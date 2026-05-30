import type { NextFunction, Request, Response } from 'express';

import { sendError } from '../lib/api-response.js';

export const notFoundMiddleware = async (
  request: Request,
  response: Response,
  _next: NextFunction
) => {
  try {
    sendError(
      response,
      {
        code: 'NOT_FOUND',
        message: `Route not found: ${request.method} ${request.originalUrl}`
      },
      404
    );
  } catch {
    response.status(404).json({
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      }
    });
  }
};
