import { Router } from 'express';
import workspaceExportRepository from '../repositories/workspaceExportRepository.js';
import { asyncRoute } from '../lib/workspaceApi.js';

const router = Router();

router.get('/', asyncRoute(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await workspaceExportRepository.createSnapshot(req.user.id));
}));

export default router;
