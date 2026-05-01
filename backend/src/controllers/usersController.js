import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import sessionRepository from '../repositories/sessionRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const users = userRepository.findAll();
  // Attach today's session count per user for "active" status
  const today = new Date().toISOString().slice(0, 10);
  const result = users.map(u => {
    const todaySessions = sessionRepository.findByDate(u.id, today);
    return {
      id: u.id,
      email: u.email,
      name: u.email.split('@')[0],
      sessionsToday: todaySessions.length,
      isActive: todaySessions.some(s => {
        const mins = (Date.now() - new Date(s.completed_at)) / 60000;
        return mins < 30; // active if completed a session in last 30 min
      }),
    };
  });
  res.json(result);
});

export default router;
