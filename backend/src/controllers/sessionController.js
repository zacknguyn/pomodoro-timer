import { Router } from 'express';
import { z } from 'zod';
import focusSessionRepository from '../repositories/focusSessionRepository.js';
import { asyncRoute } from '../lib/workspaceApi.js';

const router = Router();

const createSessionSchema = z.object({
  taskId: z.string().trim().min(1, 'taskId is required'),
  durationPlannedSeconds: z.number().int().positive().max(86_400),
}).strict();

const transitionSchema = z.object({
  action: z.enum(['pause', 'resume', 'end']),
}).strict();

router.post('/', asyncRoute(async (req, res) => {
  const session = await focusSessionRepository.create(req.user.id, createSessionSchema.parse(req.body));
  res.status(201).json(session);
}));

router.get('/active', asyncRoute(async (req, res) => {
  res.json(await focusSessionRepository.findOpen(req.user.id));
}));

router.patch('/:id', asyncRoute(async (req, res) => {
  const { action } = transitionSchema.parse(req.body);
  res.json(await focusSessionRepository.transition(req.user.id, req.params.id, action));
}));

export default router;
