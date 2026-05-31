import { Router } from 'express';

import {
  getPrismCoverageController,
  reconcilePrismObservationsController,
  updatePrismPhotoController
} from '../controllers/prisms.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validate-uuid.js';

export const prismsRouter = Router();

prismsRouter.post('/reconcile-stations', requireAuth, requireRole(['admin']), reconcilePrismObservationsController);
prismsRouter.get('/coverage/:groupCode', requireAuth, requireRole(['admin', 'topografo', 'visitante']), getPrismCoverageController);
prismsRouter.patch(
  '/:prismId/photo',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('prismId'),
  updatePrismPhotoController
);
