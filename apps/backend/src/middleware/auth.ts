import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendError } from '../lib/api-response.js';
import { supabaseAdmin } from '../lib/supabase.js';

const extractBearerToken = (request: Request) => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
};

const getRoleFromMetadata = (user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) => {
  const appRole = user.app_metadata?.role;
  const userRole = user.user_metadata?.role;

  if (appRole === 'admin' || appRole === 'topografo' || appRole === 'visitante') {
    return appRole;
  }

  if (userRole === 'admin' || userRole === 'topografo' || userRole === 'visitante') {
    return userRole;
  }

  return 'visitante';
};

export const authenticateRequest = async (request: Request, _response: Response, next: NextFunction) => {
  try {
    const token = extractBearerToken(request);

    if (!token) {
      next();
      return;
    }

    if (request.method === 'GET' && token === process.env.GUEST_PUBLIC_TOKEN) {
      request.user = {
        authProvider: 'guest',
        email: null,
        id: 'guest',
        role: 'visitante'
      };

      next();
      return;
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
    }

    request.user = {
      authProvider: 'supabase',
      email: data.user.email ?? null,
      id: data.user.id,
      role: getRoleFromMetadata(data.user)
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = async (request: Request, response: Response, next: NextFunction) => {
  try {
    if (!request.user) {
      sendError(
        response,
        {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        401
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (roles: Array<'admin' | 'topografo' | 'visitante'>) => {
  return async (request: Request, response: Response, next: NextFunction) => {
    try {
      if (!request.user) {
        sendError(
          response,
          {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          401
        );
        return;
      }

      if (!roles.includes(request.user.role)) {
        sendError(
          response,
          {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions'
          },
          403
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
