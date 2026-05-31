import { Router } from 'express';

import { createIncidentController, listIncidentsController } from '../controllers/incidents.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateOptionalUuidQuery } from '../middleware/validate-uuid.js';

export const incidentsRouter = Router();

incidentsRouter.get(
  '/',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateOptionalUuidQuery('stationId'),
  listIncidentsController
);
incidentsRouter.post('/', requireAuth, requireRole(['admin', 'topografo']), createIncidentController);
