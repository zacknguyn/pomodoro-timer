import { Router } from 'express';
import pool from '../lib/db.js';
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

router.get('/stats', async (req, res) => {
  try {
    const [users, sessions, groups, banned, perDay] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM users'),
      pool.query('SELECT COUNT(*) AS count FROM sessions'),
      pool.query('SELECT COUNT(*) AS count FROM groups'),
      pool.query('SELECT COUNT(*) AS count FROM users WHERE banned = true'),
      pool.query(`
        SELECT completed_at::date AS day, COUNT(*) AS count
        FROM sessions
        WHERE completed_at >= NOW() - INTERVAL '7 days'
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
      SELECT u.id, u.email, u.display_name, u.banned, u.created_at,
        COUNT(s.id) AS session_count,
        MAX(s.completed_at) AS last_active,
        (st.github_token IS NOT NULL) AS github_connected
      FROM users u
      LEFT JOIN sessions s ON s.user_id = u.id
      LEFT JOIN settings st ON st.user_id = u.id
      GROUP BY u.id, u.email, u.display_name, u.banned, u.created_at, st.github_token
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
    await userRepository.setBanned(req.params.id, !user.banned);
    res.json({ banned: !user.banned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    if (!await userRepository.findById(req.params.id)) {
      return res.status(404).json({ error: 'User not found' });
    }
    await userRepository.delete(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
