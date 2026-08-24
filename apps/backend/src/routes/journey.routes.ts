import { Router } from 'express';

import { listMyJourneyController } from '../controllers/monitoring.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const journeyRouter = Router();

journeyRouter.get('/', requireAuth, requireRole(['admin', 'topografo']), listMyJourneyController);
