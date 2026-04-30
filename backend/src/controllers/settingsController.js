import { Router } from 'express';
import settingsRepository from '../repositories/settingsRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const settingsSchema = z.object({
  pomodoro: z.number().min(1),
  shortBreak: z.number().min(1),
  longBreak: z.number().min(1)
});

router.get('/', async (req, res) => {
  const settings = settingsRepository.findByUserId(req.user.userId);
  res.json(settings);
});

router.patch('/', async (req, res) => {
  try {
    const data = settingsSchema.partial().parse(req.body);
    const current = settingsRepository.findByUserId(req.user.userId);
    const updated = settingsRepository.update(req.user.userId, { ...current, ...data });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
