import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import authController from './controllers/authController.js';
import sessionController from './controllers/sessionController.js';
import adminController from './controllers/adminController.js';
import taskController from './controllers/taskController.js';
import checkpointController from './controllers/checkpointController.js';
import workspaceExportController from './controllers/workspaceExportController.js';
import { workspaceErrorHandler } from './lib/workspaceApi.js';
import { authMiddleware } from './middleware/authMiddleware.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '32kb' }));

const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin !== frontendOrigin) {
    return res.status(403).json({ error: 'Invalid request origin', code: 'invalid_origin' });
  }
  if (process.env.NODE_ENV === 'production' && !origin) {
    return res.status(403).json({ error: 'Request origin required', code: 'origin_required' });
  }
  return next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authController);
app.use('/api/tasks', authMiddleware, taskController);
app.use('/api/sessions', authMiddleware, sessionController);
app.use('/api/checkpoints', authMiddleware, checkpointController);
app.use('/api/export', authMiddleware, workspaceExportController);
app.use('/api/admin', adminController);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(workspaceErrorHandler);

export default app;
