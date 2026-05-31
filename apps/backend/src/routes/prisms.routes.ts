import { Router } from 'express';

import {
  getPrismCoverageController,
  reconcilePrismObservationsController,
  updatePrismPhotoController
} from '../controllers/prisms.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const prismsRouter = Router();

prismsRouter.post('/reconcile-stations', requireAuth, requireRole(['admin']), reconcilePrismObservationsController);
prismsRouter.get('/coverage/:groupCode', getPrismCoverageController);
prismsRouter.patch('/:prismId/photo', requireAuth, requireRole(['admin', 'topografo']), updatePrismPhotoController);
