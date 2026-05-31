import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { sendError } from '../lib/api-response.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { getUserProjectIds } from '../models/project-memberships.model.js';
import { getUserProfileById } from '../models/users.model.js';

const extractBearerToken = (request: Request) => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
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
        role: 'visitante',
        projectIds: null
      };

      next();
      return;
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
    }

    const userProfile = await getUserProfileById(data.user.id);

    if (!userProfile?.isActive) {
      throw new AppError('User is inactive or not registered', 403, 'USER_INACTIVE_OR_UNKNOWN');
    }

    request.user = {
      authProvider: 'supabase',
      email: userProfile.email ?? data.user.email ?? null,
      id: data.user.id,
      role: userProfile.role,
      projectIds: userProfile.role === 'admin' ? null : await getUserProjectIds(userProfile.id)
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
