import { Router } from 'express';

import {
  createGuideEntryController,
  deleteGuideEntryController,
  getGuideEntryByIdController,
  listGuideEntriesController,
  updateGuideEntryController
} from '../controllers/guide.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const guideRouter = Router();

guideRouter.get('/', requireAuth, requireRole(['admin', 'topografo', 'visitante']), listGuideEntriesController);
guideRouter.get('/:guideEntryId', requireAuth, requireRole(['admin', 'topografo', 'visitante']), getGuideEntryByIdController);
guideRouter.post('/', requireAuth, requireRole(['admin']), createGuideEntryController);
guideRouter.patch('/:guideEntryId', requireAuth, requireRole(['admin']), updateGuideEntryController);
guideRouter.delete('/:guideEntryId', requireAuth, requireRole(['admin']), deleteGuideEntryController);
