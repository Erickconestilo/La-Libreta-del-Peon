import { Router } from 'express';

import { sendSuccess } from '../lib/api-response.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserProfileById } from '../models/users.model.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (request, response) => {
  try {
    if (!request.user) {
      response.status(401).json({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (request.user.authProvider === 'guest') {
      sendSuccess(response, {
        user: {
          ...request.user,
          fullName: 'Visitante',
          isActive: true
        }
      });
      return;
    }

    const userProfile = await getUserProfileById(request.user.id);

    sendSuccess(response, {
      user: {
        ...request.user,
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
});
