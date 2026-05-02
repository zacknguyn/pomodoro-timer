import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authController from './src/controllers/authController.js';
import sessionController from './src/controllers/sessionController.js';
import settingsController from './src/controllers/settingsController.js';
import githubController from './src/controllers/githubController.js';
import groupController from './src/controllers/groupController.js';
import usersController from './src/controllers/usersController.js';
import adminController from './src/controllers/adminController.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authController);
app.use('/api/sessions', sessionController);
app.use('/api/settings', settingsController);
app.use('/api/github', githubController);
app.use('/api/users', usersController);
app.use('/api/groups', groupController);
app.use('/api/admin', adminController);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
