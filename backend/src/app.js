import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authController from './controllers/authController.js';
import sessionController from './controllers/sessionController.js';
import settingsController from './controllers/settingsController.js';
import githubController from './controllers/githubController.js';
import groupController from './controllers/groupController.js';
import usersController from './controllers/usersController.js';
import adminController from './controllers/adminController.js';
import taskController from './controllers/taskController.js';
import checkpointController from './controllers/checkpointController.js';
import workspaceExportController from './controllers/workspaceExportController.js';
import { workspaceErrorHandler } from './lib/workspaceApi.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authController);
app.use('/api/tasks', taskController);
app.use('/api/sessions', sessionController);
app.use('/api/checkpoints', checkpointController);
app.use('/api/export', workspaceExportController);

// Legacy routes remain mounted during the phased rebuild, but are not part of
// the Phase 1 MVP contract above.
app.use('/api/settings', settingsController);
app.use('/api/github', githubController);
app.use('/api/users', usersController);
app.use('/api/groups', groupController);
app.use('/api/admin', adminController);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(workspaceErrorHandler);

export default app;
