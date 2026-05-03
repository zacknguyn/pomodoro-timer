import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authController from './src/controllers/authController.js';
import sessionController from './src/controllers/sessionController.js';
import settingsController from './src/controllers/settingsController.js';
import githubController from './src/controllers/githubController.js';
import groupController from './src/controllers/groupController.js';
import usersController from './src/controllers/usersController.js';
import adminController from './src/controllers/adminController.js';
import authService from './src/services/authService.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api/auth', authLimiter, authController);
app.use('/api/sessions', sessionController);
app.use('/api/settings', settingsController);
app.use('/api/github', githubController);
app.use('/api/users', usersController);
app.use('/api/groups', groupController);
app.use('/api/admin', adminController);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, async () => {
  await authService.seedInitialAdmin();
  console.log(`Backend listening at http://localhost:${port}`);
});
