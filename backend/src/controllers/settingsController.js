import { Router } from 'express';
import settingsRepository from '../repositories/settingsRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const settingsSchema = z.object({
  pomodoro: z.number().min(1),
  shortBreak: z.number().min(1),
  longBreak: z.number().min(1),
});

router.get('/', async (req, res) => {
  res.json(await settingsRepository.findByUserId(req.user.userId));
});

router.patch('/', async (req, res) => {
  try {
    const data = settingsSchema.partial().parse(req.body);
    const current = await settingsRepository.findByUserId(req.user.userId);
    res.json(await settingsRepository.update(req.user.userId, { ...current, ...data }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/github', async (req, res) => {
  await settingsRepository.clearGithub(req.user.userId);
  res.json({ success: true });
});

export default router;
