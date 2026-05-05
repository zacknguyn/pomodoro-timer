import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import serverlessExpress from '@vendia/serverless-express';
import controller from '../controllers/githubController.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use('/api/github', controller);

const serverlessApp = serverlessExpress({ app });
export const handler = (event, context) => serverlessApp(event, context);
