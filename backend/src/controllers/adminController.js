import { Router } from 'express';
import pool from '../lib/db.js';
import userRepository from '../repositories/userRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// All admin routes require role === 'admin' or 'superadmin'
const adminMiddleware = [authMiddleware, (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
}];

router.use(adminMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const [users, sessions, groups, banned, perDay] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM users'),
      pool.query('SELECT COUNT(*) AS count FROM sessions'),
      pool.query('SELECT COUNT(*) AS count FROM groups'),
      pool.query('SELECT COUNT(*) AS count FROM users WHERE banned = true'),
      pool.query(`
        SELECT completed_at::date AS day, COUNT(*) AS count
        FROM sessions WHERE completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day DESC
      `),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalSessions: parseInt(sessions.rows[0].count),
      totalGroups: parseInt(groups.rows[0].count),
      bannedUsers: parseInt(banned.rows[0].count),
      sessionsPerDay: perDay.rows,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, u.display_name, u.banned, u.role, u.created_at,
        COUNT(s.id) AS session_count,
        MAX(s.completed_at) AS last_active,
        (st.github_token IS NOT NULL) AS github_connected
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id
      LEFT JOIN settings st ON st.user_id = u.id
      GROUP BY u.id, u.email, u.display_name, u.banned, u.role, u.created_at, st.github_token
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/users/:id/ban', async (req, res) => {
  try {
    const user = await userRepository.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.userId) return res.status(400).json({ error: 'Cannot ban yourself' });
    await userRepository.setBanned(req.params.id, !user.banned);
    res.json({ banned: !user.banned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'role must be user or admin' });
    const user = await userRepository.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.id === req.user.userId) return res.status(400).json({ error: 'Cannot change your own role' });
    // Only superadmin can demote another admin
    if (user.role === 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only superadmin can demote an admin' });
    }
    // Nobody can change a superadmin's role
    if (user.role === 'superadmin') {
      return res.status(403).json({ error: 'Cannot change superadmin role' });
    }
    await userRepository.setRole(req.params.id, role);
    res.json({ role });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (!await userRepository.findById(req.params.id)) return res.status(404).json({ error: 'User not found' });
    if (req.params.id === req.user.userId) return res.status(400).json({ error: 'Cannot delete yourself' });
    await userRepository.delete(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
