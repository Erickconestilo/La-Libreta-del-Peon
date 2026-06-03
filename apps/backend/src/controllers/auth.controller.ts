import type { Request, Response } from 'express';

import { AppError } from '../lib/app-error.js';
import { getUserProfileById } from '../models/users.model.js';
import { sendSuccess } from '../lib/api-response.js';
import { supabaseAnon } from '../lib/supabase.js';

type AuthSessionUser = {
  authProvider: 'guest' | 'supabase';
  email: string | null;
  fullName: string | null;
  id: string;
  isActive: boolean | null;
  role: 'admin' | 'topografo' | 'visitante';
};

type ApiAuthResponse = {
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string | null;
  };
  user: AuthSessionUser;
};

const ensureTechnicalRole = (user: AuthSessionUser) => {
  if (user.role === 'visitante') {
    throw new AppError('This endpoint is only available for admin or topógrafo', 403, 'TECHNICAL_ROLE_REQUIRED');
  }

  return user;
};

const buildAuthSessionPayload = (userProfile: Exclude<AuthSessionUser, 'authProvider'>, session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
}) => {
  return {
    session: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
    },
    user: {
      ...userProfile,
      authProvider: 'supabase'
    } satisfies ApiAuthResponse['user']
  };
};

const resolveTechnicalSession = async (email: string, password: string) => {
  const authResult = await supabaseAnon.auth.signInWithPassword({
    email,
    password
  });

  if (authResult.error || !authResult.data.session) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const userProfile = await getUserProfileById(authResult.data.user.id);
  if (!userProfile) {
    throw new AppError('User is inactive or not registered', 403, 'USER_INACTIVE_OR_UNKNOWN');
  }

  if (!userProfile.isActive) {
    throw new AppError('User is inactive or not registered', 403, 'USER_INACTIVE_OR_UNKNOWN');
  }

  const normalizedUser: AuthSessionUser = {
    authProvider: 'supabase',
    email: userProfile.email,
    fullName: userProfile.fullName,
    id: userProfile.id,
    isActive: userProfile.isActive,
    role: userProfile.role
  };

  return buildAuthSessionPayload(normalizedUser, authResult.data.session);
};

export const loginWithPasswordController = async (request: Request, response: Response) => {
  try {
    const body = request.body as {
      email?: string;
      password?: string;
    };
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    const payload = await resolveTechnicalSession(email, password);
    const _user = ensureTechnicalRole(payload.user);
    sendSuccess(response, payload);
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
        code: 'AUTH_LOGIN_FAILED',
        message: 'Unable to start technical session'
      }
    });
  }
};

export const refreshSessionController = async (request: Request, response: Response) => {
  try {
    const body = request.body as {
      refreshToken?: string;
    };
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken.trim() : '';

    if (!refreshToken) {
      throw new AppError('refreshToken is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    const refreshResult = await supabaseAnon.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (refreshResult.error || !refreshResult.data.session || !refreshResult.data.user) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const userProfile = await getUserProfileById(refreshResult.data.user.id);
    if (!userProfile || !userProfile.isActive) {
      throw new AppError('User is inactive or not registered', 403, 'USER_INACTIVE_OR_UNKNOWN');
    }

    const normalizedUser: AuthSessionUser = {
      authProvider: 'supabase',
      email: userProfile.email,
      fullName: userProfile.fullName,
      id: userProfile.id,
      isActive: userProfile.isActive,
      role: userProfile.role
    };

    const payload = buildAuthSessionPayload(normalizedUser, refreshResult.data.session);
    ensureTechnicalRole(payload.user);

    sendSuccess(response, payload);
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
        code: 'AUTH_REFRESH_FAILED',
        message: 'Unable to refresh session'
      }
    });
  }
};

export const getAuthMeController = async (request: Request, response: Response) => {
  try {
    const { user } = request;

    if (!user) {
      response.status(401).json({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (user.authProvider === 'guest') {
      sendSuccess(response, {
        user: {
          ...user,
          fullName: 'Visitante',
          isActive: true
        }
      });
      return;
    }

    const userProfile = await getUserProfileById(user.id);
    sendSuccess(response, {
      user: {
        ...user,
        fullName: userProfile?.fullName ?? null,
        isActive: userProfile?.isActive ?? null
      }
    });
  } catch {
    response.status(500).json({
      data: null,
      error: {
        code: 'AUTH_ME_FAILED',
        message: 'Unable to load current user'
      }
    });
  }
};
