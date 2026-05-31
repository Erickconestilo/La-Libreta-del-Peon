import { Router } from 'express';

import {
  createGuideEntryController,
  deleteGuideEntryController,
  getGuideEntryByIdController,
  listGuideEntriesController,
  updateGuideEntryController
} from '../controllers/guide.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateUuidParam } from '../middleware/validate-uuid.js';

export const guideRouter = Router();

guideRouter.get('/', requireAuth, requireRole(['admin', 'topografo', 'visitante']), listGuideEntriesController);
guideRouter.get(
  '/:guideEntryId',
  requireAuth,
  requireRole(['admin', 'topografo', 'visitante']),
  validateUuidParam('guideEntryId'),
  getGuideEntryByIdController
);
guideRouter.post('/', requireAuth, requireRole(['admin']), createGuideEntryController);
guideRouter.patch(
  '/:guideEntryId',
  requireAuth,
  requireRole(['admin']),
  validateUuidParam('guideEntryId'),
  updateGuideEntryController
);
guideRouter.delete(
  '/:guideEntryId',
  requireAuth,
  requireRole(['admin']),
  validateUuidParam('guideEntryId'),
  deleteGuideEntryController
);
