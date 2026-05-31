import { Router } from 'express';

import {
  getPrismCoverageController,
  reconcilePrismObservationsController
} from '../controllers/prisms.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const prismsRouter = Router();

prismsRouter.post('/reconcile-stations', requireAuth, requireRole(['admin']), reconcilePrismObservationsController);
prismsRouter.get('/coverage/:groupCode', getPrismCoverageController);
