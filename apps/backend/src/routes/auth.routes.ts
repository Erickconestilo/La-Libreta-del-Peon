import { Router } from 'express';

import {
  getAuthMeController,
  loginWithPasswordController,
  refreshSessionController
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', loginWithPasswordController);
authRouter.post('/refresh', refreshSessionController);
authRouter.get('/me', requireAuth, getAuthMeController);
