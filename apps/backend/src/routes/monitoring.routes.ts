import { Router } from 'express';

import {
  createInstrumentReadingController,
  createRoundPointController
} from '../controllers/monitoring.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validate-uuid.js';

export const roundsRouter = Router();
export const roundPointsRouter = Router();

roundsRouter.post(
  '/:roundId/points',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('roundId'),
  createRoundPointController
);

roundPointsRouter.post(
  '/:roundPointId/readings',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('roundPointId'),
  createInstrumentReadingController
);
