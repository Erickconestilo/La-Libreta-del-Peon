import { Router } from 'express';

import { sendSuccess } from '../lib/api-response.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.get('/me', requireAuth, async (request, response) => {
  try {
    sendSuccess(response, {
      user: request.user
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
