import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import serverlessExpress from '@vendia/serverless-express';
import controller from '../controllers/authController.js';
import authService from '../services/authService.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/api/auth', controller);

const serverlessApp = serverlessExpress({ app });

let seeded = false;
export const handler = async (event, context) => {
  if (!seeded) {
    await authService.seedInitialAdmin();
    seeded = true;
  }
  return serverlessApp(event, context);
};
