import { Router } from 'express';

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
