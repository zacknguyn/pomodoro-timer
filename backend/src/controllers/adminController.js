import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import pool from '../lib/db.js';
import userRepository from '../repositories/userRepository.js';
import authSessionRepository from '../repositories/authSessionRepository.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import { ApiError, asyncRoute } from '../lib/workspaceApi.js';

const router = Router();
const roleSchema = z.object({ role: z.enum(['user', 'admin']) }).strict();
const adminOverviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
const adminUsersLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authMiddleware, requireRole('admin', 'superadmin'));
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

async function audit(actorId, action, targetId, metadata = {}) {
  await pool.query(
    `INSERT INTO admin_audit_logs (actor_id, action, target_id, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [actorId, action, targetId, JSON.stringify(metadata)]
  );
}

router.get('/overview', adminOverviewLimiter, asyncRoute(async (_req, res) => {
  const [summary, activity, auditRows] = await Promise.all([
    pool.query(`SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM users WHERE banned) AS suspended,
      (SELECT COUNT(*) FROM tasks) AS tasks,
      (SELECT COUNT(*) FROM focus_sessions WHERE started_at >= NOW() - INTERVAL '24 hours') AS sessions_today`),
    pool.query(`SELECT date_trunc('day', started_at)::date AS day, COUNT(*)::int AS count
      FROM focus_sessions
      WHERE started_at >= NOW() - INTERVAL '6 days'
      GROUP BY day ORDER BY day`),
    pool.query(`SELECT l.id, l.action, l.target_id, l.created_at, u.email AS actor_email
      FROM admin_audit_logs l LEFT JOIN users u ON u.id = l.actor_id
      ORDER BY l.created_at DESC LIMIT 12`),
  ]);
  const row = summary.rows[0];
  res.json({
    summary: {
      users: Number(row.users),
      suspended: Number(row.suspended),
      tasks: Number(row.tasks),
      sessionsToday: Number(row.sessions_today),
    },
    activity: activity.rows,
    audit: auditRows.rows,
  });
}));

router.get('/users', adminUsersLimiter, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.email, u.display_name, u.banned, u.role, u.created_at,
      COUNT(DISTINCT t.id)::int AS task_count,
      COUNT(DISTINCT s.id)::int AS focus_session_count,
      MAX(s.started_at) AS last_active
    FROM users u
    LEFT JOIN tasks t ON t.user_id = u.id
    LEFT JOIN focus_sessions s ON s.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  res.json(rows);
}));

router.patch('/users/:id/ban', asyncRoute(async (req, res) => {
  const user = await userRepository.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'user_not_found');
  if (user.id === req.user.id) throw new ApiError(400, 'You cannot suspend your own account', 'self_action');
  if (user.role === 'superadmin') throw new ApiError(403, 'A superadmin cannot be suspended here', 'protected_account');
  const banned = !user.banned;
  await userRepository.setBanned(user.id, banned);
  await authSessionRepository.revokeAllForUser(user.id);
  await audit(req.user.id, banned ? 'user.suspended' : 'user.restored', user.id);
  res.json({ banned });
}));

router.patch('/users/:id/role', asyncRoute(async (req, res) => {
  const { role } = roleSchema.parse(req.body);
  const user = await userRepository.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'user_not_found');
  if (user.id === req.user.id) throw new ApiError(400, 'You cannot change your own role', 'self_action');
  if (user.role === 'superadmin') throw new ApiError(403, 'The superadmin role is protected', 'protected_account');
  if ((user.role === 'admin' || role === 'admin') && req.user.role !== 'superadmin') {
    throw new ApiError(403, 'Only a superadmin can change administrator access', 'superadmin_required');
  }
  await userRepository.setRole(user.id, role);
  await authSessionRepository.revokeAllForUser(user.id);
  await audit(req.user.id, 'user.role_changed', user.id, { from: user.role, to: role });
  res.json({ role });
}));

router.delete('/users/:id', asyncRoute(async (req, res) => {
  const user = await userRepository.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'user_not_found');
  if (user.id === req.user.id) throw new ApiError(400, 'You cannot delete your own account', 'self_action');
  if (user.role !== 'user') throw new ApiError(403, 'Remove elevated access before deleting this account', 'protected_account');
  await audit(req.user.id, 'user.deleted', user.id, { email: user.email });
  await userRepository.delete(user.id);
  res.status(204).end();
}));

export default router;
