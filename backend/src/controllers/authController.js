import { Router } from 'express';
import authService from '../services/authService.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in a minute' },
});

router.use(authLimiter);

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

router.post('/register', async (req, res) => {
  try {
    const { email, password } = authSchema.parse(req.body);
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = authSchema.parse(req.body);
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
