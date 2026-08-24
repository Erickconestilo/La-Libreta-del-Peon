import { Router } from 'express';

import {
  createControlPointThresholdController,
  createReadingAttachmentController,
  createInstrumentReadingController,
  createRoundPointController,
  exportMonitoringRoundController,
  getMonitoringRoundDetailController,
  getReadingHistoryController,
  listControlPointThresholdsController,
  updateMonitoringRoundStatusController,
  updateControlPointController
} from '../controllers/monitoring.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validate-uuid.js';

export const roundsRouter = Router();
export const roundPointsRouter = Router();
export const controlPointsRouter = Router();

roundsRouter.get(
  '/:roundId/export',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('roundId'),
  exportMonitoringRoundController
);

roundsRouter.get(
  '/:roundId',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('roundId'),
  getMonitoringRoundDetailController
);

roundsRouter.patch(
  '/:roundId',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('roundId'),
  updateMonitoringRoundStatusController
);

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

roundPointsRouter.post(
  '/:roundPointId/readings/:readingId/attachments',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('roundPointId'),
  validateUuidParam('readingId'),
  createReadingAttachmentController
);

controlPointsRouter.patch(
  '/:controlPointId',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('controlPointId'),
  updateControlPointController
);

controlPointsRouter.get(
  '/:controlPointId/readings',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('controlPointId'),
  getReadingHistoryController
);

controlPointsRouter.post(
  '/:controlPointId/thresholds',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('controlPointId'),
  createControlPointThresholdController
);

controlPointsRouter.get(
  '/:controlPointId/thresholds',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('controlPointId'),
  listControlPointThresholdsController
);
