import { Router } from 'express';

import {
  getProjectByIdController,
  listProjectsController,
  updateProjectPhotoController
} from '../controllers/projects.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const projectsRouter = Router();

projectsRouter.get('/', listProjectsController);
projectsRouter.get('/:projectId', getProjectByIdController);
projectsRouter.patch('/:projectId/photo', requireAuth, requireRole(['admin', 'topografo']), updateProjectPhotoController);
