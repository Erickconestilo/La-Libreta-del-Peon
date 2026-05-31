import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { authenticateRequest } from './middleware/auth.js';
import { errorHandlerMiddleware } from './middleware/error-handler.js';
import { notFoundMiddleware } from './middleware/not-found.js';
import { authRouter } from './routes/auth.routes.js';
import { changeLogsRouter } from './routes/change-logs.routes.js';
import { guideRouter } from './routes/guide.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { prismsRouter } from './routes/prisms.routes.js';
import { stationsRouter } from './routes/stations.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';

dotenv.config();

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.get('/api/v1/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.use(authenticateRequest);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/change-logs', changeLogsRouter);
app.use('/api/v1/guide-entries', guideRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/prisms', prismsRouter);
app.use('/api/v1/stations', stationsRouter);
app.use('/api/v1/uploads', uploadsRouter);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);
