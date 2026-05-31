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
import { listStationPrismsController } from '../controllers/prisms.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const stationsRouter = Router();

stationsRouter.get('/', listStationsController);
stationsRouter.get('/:stationId/photos', listStationPhotosController);
stationsRouter.post('/:stationId/photos', requireAuth, requireRole(['admin', 'topografo']), createStationPhotoController);
stationsRouter.delete(
  '/:stationId/photos/:stationPhotoId',
  requireAuth,
  requireRole(['admin', 'topografo']),
  deleteStationPhotoController
);
stationsRouter.get('/:stationId/prisms', listStationPrismsController);
stationsRouter.get('/:stationId', getStationByIdController);
stationsRouter.post('/', requireAuth, requireRole(['admin', 'topografo']), createStationController);
stationsRouter.patch('/:stationId/notes', requireAuth, requireRole(['admin', 'topografo']), updateStationNotesController);
stationsRouter.patch('/:stationId/photo', requireAuth, requireRole(['admin', 'topografo']), updateStationPhotoController);
