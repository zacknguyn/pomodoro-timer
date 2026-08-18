import { Router } from 'express';
import { z } from 'zod';
import authService from '../services/authService.js';
import authSessionRepository, { hashSessionToken } from '../repositories/authSessionRepository.js';
import { authMiddleware, getSessionToken, SESSION_COOKIE } from '../middleware/authMiddleware.js';
import { asyncRoute } from '../lib/workspaceApi.js';

const router = Router();
const authSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12, 'Use at least 12 characters').max(128),
}).strict();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

function cookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  };
}

function requestContext(req) {
  return {
    userAgent: req.get('user-agent')?.slice(0, 500),
    ipAddress: req.ip,
  };
}

async function authenticate(req, res, mode) {
  const input = authSchema.parse(req.body);
  const result = await authService[mode](input.email, input.password, requestContext(req));
  res.cookie(SESSION_COOKIE, result.token, cookieOptions(result.expiresAt));
  res.status(mode === 'register' ? 201 : 200).json({ user: result.user });
}

router.post('/register', asyncRoute((req, res) => authenticate(req, res, 'register')));
router.post('/login', asyncRoute((req, res) => authenticate(req, res, 'login')));

router.get('/me', authMiddleware, (req, res) => {
  const { id, email, role } = req.user;
  res.json({ user: { id, email, role } });
});

router.post('/logout', asyncRoute(async (req, res) => {
  const token = getSessionToken(req);
  if (token) await authSessionRepository.revoke(hashSessionToken(token));
  res.clearCookie(SESSION_COOKIE, cookieOptions(new Date(0)));
  res.status(204).end();
}));

export default router;
