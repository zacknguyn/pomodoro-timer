import { Router } from 'express';
import workspaceExportRepository from '../repositories/workspaceExportRepository.js';
import { asyncRoute } from '../lib/workspaceApi.js';

const router = Router();

router.get('/', asyncRoute(async (_req, res) => {
  res.json(await workspaceExportRepository.createSnapshot());
}));

export default router;
