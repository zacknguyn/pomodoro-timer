import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import serverlessExpress from '@vendia/serverless-express';
import usersController from '../controllers/usersController.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/api/users', usersController);

export const handler = serverlessExpress({ app });
