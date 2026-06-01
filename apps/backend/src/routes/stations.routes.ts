import { Router } from 'express';

import {
  createStationController,
  getStationByIdController,
  listStationsController,
  updateStationNotesController,
  updateStationPhotoController
} from '../controllers/stations.controller.js';
import {
  createStationPhotoController,
  deleteStationPhotoController,
  listStationPhotosController
} from '../controllers/station-photos.controller.js';
import {
  createStationMessageController,
  listRecentStationMessagesController,
  listStationMessagesController
} from '../controllers/station-messages.controller.js';
import { listStationPrismsController } from '../controllers/prisms.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateOptionalUuidQuery, validateUuidParam } from '../middleware/validate-uuid.js';

export const stationsRouter = Router();

stationsRouter.get(
  '/',
  requireAuth,
  requireRole(['admin', 'topografo', 'visitante']),
  validateOptionalUuidQuery('projectId'),
  listStationsController
);
stationsRouter.get(
  '/messages',
  requireAuth,
  requireRole(['admin', 'topografo']),
  listRecentStationMessagesController
);
stationsRouter.get(
  '/:stationId/photos',
  requireAuth,
  requireRole(['admin', 'topografo', 'visitante']),
  validateUuidParam('stationId'),
  listStationPhotosController
);
stationsRouter.post(
  '/:stationId/photos',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('stationId'),
  createStationPhotoController
);
stationsRouter.delete(
  '/:stationId/photos/:stationPhotoId',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('stationId'),
  validateUuidParam('stationPhotoId'),
  deleteStationPhotoController
);
stationsRouter.get(
  '/:stationId/messages',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('stationId'),
  listStationMessagesController
);
stationsRouter.post(
  '/:stationId/messages',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('stationId'),
  createStationMessageController
);
stationsRouter.get(
  '/:stationId/prisms',
  requireAuth,
  requireRole(['admin', 'topografo', 'visitante']),
  validateUuidParam('stationId'),
  listStationPrismsController
);
stationsRouter.get(
  '/:stationId',
  requireAuth,
  requireRole(['admin', 'topografo', 'visitante']),
  validateUuidParam('stationId'),
  getStationByIdController
);
stationsRouter.post('/', requireAuth, requireRole(['admin', 'topografo']), createStationController);
stationsRouter.patch(
  '/:stationId/notes',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('stationId'),
  updateStationNotesController
);
stationsRouter.patch(
  '/:stationId/photo',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('stationId'),
  updateStationPhotoController
);
