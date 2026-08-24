import express, { Router } from 'express';

import {
  createControlPointController,
  createMonitoringRoundController,
  importProjectCodeCatalogController,
  listControlPointsController,
  listMonitoringRoundsController,
  listProjectOperatorsController,
  listProjectCodeCatalogController
} from '../controllers/monitoring.controller.js';
import {
  createProjectController,
  getProjectByIdController,
  listProjectsController,
  updateProjectPhotoController
} from '../controllers/projects.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validate-uuid.js';

export const projectsRouter = Router();

projectsRouter.get('/', requireAuth, requireRole(['admin', 'topografo', 'visitante']), listProjectsController);
projectsRouter.post('/', requireAuth, requireRole(['admin']), createProjectController);
projectsRouter.get(
  '/:projectId/code-catalog',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('projectId'),
  listProjectCodeCatalogController
);
projectsRouter.post(
  '/:projectId/code-catalog/import',
  requireAuth,
  requireRole(['admin']),
  validateUuidParam('projectId'),
  express.text({ limit: '1mb', type: ['text/csv', 'text/plain', 'application/csv', '*/*'] }),
  importProjectCodeCatalogController
);
projectsRouter.get(
  '/:projectId',
  requireAuth,
  requireRole(['admin', 'topografo', 'visitante']),
  validateUuidParam('projectId'),
  getProjectByIdController
);
projectsRouter.patch(
  '/:projectId/photo',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('projectId'),
  updateProjectPhotoController
);
projectsRouter.get(
  '/:projectId/rounds',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('projectId'),
  listMonitoringRoundsController
);
projectsRouter.get(
  '/:projectId/operators',
  requireAuth,
  requireRole(['admin']),
  validateUuidParam('projectId'),
  listProjectOperatorsController
);
projectsRouter.post(
  '/:projectId/rounds',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('projectId'),
  createMonitoringRoundController
);
projectsRouter.get(
  '/:projectId/control-points',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('projectId'),
  listControlPointsController
);
projectsRouter.post(
  '/:projectId/control-points',
  requireAuth,
  requireRole(['admin', 'topografo']),
  validateUuidParam('projectId'),
  createControlPointController
);
