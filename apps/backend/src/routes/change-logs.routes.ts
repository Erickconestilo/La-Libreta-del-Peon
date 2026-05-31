import { Router } from 'express';

import { listChangeLogsController } from '../controllers/change-logs.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const changeLogsRouter = Router();

changeLogsRouter.get('/', requireAuth, requireRole(['admin', 'topografo']), listChangeLogsController);
