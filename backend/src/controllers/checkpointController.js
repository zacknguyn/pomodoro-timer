import { Router } from 'express';
import { z } from 'zod';
import checkpointRepository from '../repositories/checkpointRepository.js';
import { asyncRoute } from '../lib/workspaceApi.js';

const router = Router();

export const checkpointSchema = z.object({
  taskId: z.string().trim().min(1, 'taskId is required'),
  sessionId: z.string().trim().min(1, 'sessionId is required'),
  whatChanged: z.string().max(4_000).optional().default(''),
  nextStep: z.string().trim().max(2_000).optional().default(''),
  outcome: z.enum(['continue', 'complete']),
}).strict().superRefine((checkpoint, context) => {
  if (checkpoint.outcome === 'continue' && !checkpoint.nextStep) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nextStep'],
      message: 'nextStep is required when outcome is continue',
    });
  }
});

router.get('/', asyncRoute(async (req, res) => {
  res.json(await checkpointRepository.findAll(req.user.id));
}));

router.post('/', asyncRoute(async (req, res) => {
  const checkpoint = await checkpointRepository.create(req.user.id, checkpointSchema.parse(req.body));
  res.status(201).json(checkpoint);
}));

export default router;
