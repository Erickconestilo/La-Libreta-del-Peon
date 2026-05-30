import { Router } from 'express';

import {
  createStationController,
  getStationByIdController,
  listStationsController
} from '../controllers/stations.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const stationsRouter = Router();

stationsRouter.get('/', listStationsController);
stationsRouter.get('/:stationId', getStationByIdController);
stationsRouter.post('/', requireAuth, requireRole(['admin', 'topografo']), createStationController);
