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

router.get('/export', (req, res) => {
  const tzOffset = parseInt(req.query.tz) || 0; // minutes offset from UTC
  const sessions = sessionRepository.findByUserId(req.user.userId);
  const toLocal = (utc) => {
    const d = new Date(new Date(utc).getTime() + tzOffset * 60000);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  };
  const rows = [
    ['id', 'mode', 'duration_minutes', 'intent', 'repo', 'completed_at_local'],
    ...sessions.map(s => [s.id, s.mode, s.duration, s.intent || '', s.repo_name || '', toLocal(s.completed_at)]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pomogit-sessions.csv"');
  res.send(csv);
});

router.get('/stats', (req, res) => {
  const tz = parseInt(req.query.tz) || 0;
  const stats = sessionRepository.getStats(req.user.userId, tz);
  res.json(stats);
});

router.get('/heatmap', (req, res) => {
  const tz = parseInt(req.query.tz) || 0;
  res.json(sessionRepository.getHeatmap(req.user.userId, tz));
});

router.get('/', async (req, res) => {
  const { date } = req.query;
  if (date) {
    return res.json(sessionRepository.findByDate(req.user.userId, date));
  }
  res.json(sessionRepository.findByUserId(req.user.userId));
});

router.delete('/:id', (req, res) => {
  sessionRepository.delete(req.params.id, req.user.userId);
  res.status(204).end();
});

export default router;
