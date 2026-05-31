import { Router } from 'express';

import { createSignedPhotoUploadController } from '../controllers/uploads.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const uploadsRouter = Router();

uploadsRouter.post('/photos/sign', requireAuth, requireRole(['admin', 'topografo']), createSignedPhotoUploadController);
