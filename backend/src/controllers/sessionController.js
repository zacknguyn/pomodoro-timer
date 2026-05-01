import { Router } from 'express';
import sessionRepository from '../repositories/sessionRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const sessionSchema = z.object({
  mode: z.enum(['pomodoro', 'shortBreak', 'longBreak']),
  duration: z.number(),
  intent: z.string().optional(),
  repoName: z.string().optional()
});

router.post('/', async (req, res) => {
  try {
    const data = sessionSchema.parse(req.body);
    const session = sessionRepository.create({ ...data, userId: req.user.userId });
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', (req, res) => {
  const stats = sessionRepository.getStats(req.user.userId);
  res.json(stats);
});

router.get('/heatmap', (req, res) => {
  res.json(sessionRepository.getHeatmap(req.user.userId));
});

router.get('/', async (req, res) => {
  const sessions = sessionRepository.findByUserId(req.user.userId);
  res.json(sessions);
});

export default router;
