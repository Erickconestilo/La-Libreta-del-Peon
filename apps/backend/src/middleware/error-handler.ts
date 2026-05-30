import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendError } from '../lib/api-response.js';

export const errorHandlerMiddleware = async (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
) => {
  try {
    if (error instanceof AppError) {
      sendError(
        response,
        {
          code: error.code,
          details: error.details,
          message: error.message
        },
        error.statusCode
      );
      return;
    }

    sendError(
      response,
      {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      },
      500
    );
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};
