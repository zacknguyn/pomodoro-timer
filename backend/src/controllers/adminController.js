import { Router } from 'express';
import db from '../lib/db.js';
import userRepository from '../repositories/userRepository.js';

const router = Router();

const adminAuth = (req, res, next) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers['x-admin-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

router.use(adminAuth);

router.get('/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
  const totalGroups = db.prepare('SELECT COUNT(*) as count FROM groups').get().count;
  const bannedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE banned = 1').get().count;
  const sessionsPerDay = db.prepare(`
    SELECT date(completed_at) as day, COUNT(*) as count
    FROM sessions
    WHERE completed_at >= date('now', '-7 days')
    GROUP BY day ORDER BY day DESC
  `).all();
  res.json({ totalUsers, totalSessions, totalGroups, bannedUsers, sessionsPerDay });
});

router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.display_name, u.banned, u.created_at,
      COUNT(s.id) as session_count,
      MAX(s.completed_at) as last_active
    FROM users u
    LEFT JOIN sessions s ON s.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

router.patch('/users/:id/ban', (req, res) => {
  const user = userRepository.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  userRepository.setBanned(req.params.id, !user.banned);
  res.json({ banned: !user.banned });
});

router.delete('/users/:id', (req, res) => {
  if (!userRepository.findById(req.params.id)) return res.status(404).json({ error: 'User not found' });
  userRepository.delete(req.params.id);
  res.status(204).end();
});

export default router;
