import type { Response } from 'express';

export interface ApiErrorBody {
  code?: string;
  details?: unknown;
  message: string;
}

export interface ApiMeta {
  [key: string]: unknown;
}

export const sendSuccess = <T>(
  response: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta
) => {
  response.status(statusCode).json({
    data,
    error: null,
    ...(meta ? { meta } : {})
  });
};

export const sendError = (
  response: Response,
  error: ApiErrorBody,
  statusCode = 500,
  meta?: ApiMeta
) => {
  response.status(statusCode).json({
    data: null,
    error,
    ...(meta ? { meta } : {})
  });
};
