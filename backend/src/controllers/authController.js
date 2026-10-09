import { Router } from 'express';
import { z } from 'zod';
import authService from '../services/authService.js';
import authSessionRepository, { hashSessionToken } from '../repositories/authSessionRepository.js';
import { authMiddleware, getSessionToken, readCookie, SESSION_COOKIE } from '../middleware/authMiddleware.js';
import { asyncRoute } from '../lib/workspaceApi.js';
import { startGithubLogin, finishGithubLogin, GITHUB_COOKIE } from '../services/githubAuthService.js';

const router = Router();
const authSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
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
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

function requestContext(req) {
  return {
    userAgent: req.get('user-agent')?.slice(0, 500),
    ipAddress: req.ip,
  };
}

async function authenticate(req, res, mode) {
  const input = (mode === 'register' ? authSchema.extend({ password: z.string().min(12, 'Use at least 12 characters').max(128) }) : authSchema).parse(req.body);
  const result = await authService[mode](input.email, input.password, requestContext(req));
  res.cookie(SESSION_COOKIE, result.token, cookieOptions(result.expiresAt));
  res.status(mode === 'register' ? 201 : 200).json({ user: result.user });
}

router.post('/register', asyncRoute((req, res) => authenticate(req, res, 'register')));
router.post('/login', asyncRoute((req, res) => authenticate(req, res, 'login')));

router.post('/github', asyncRoute(async (_req, res) => {
  const { authorizationUrl, state, expiresAt } = await startGithubLogin();
  res.cookie(GITHUB_COOKIE, state, cookieOptions(expiresAt));
  res.json({ authorizationUrl });
}));

router.get('/github/callback', asyncRoute(async (req, res) => {
  const destination = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
  destination.pathname = '/';
  destination.search = '';
  destination.hash = 'work';
  res.clearCookie(GITHUB_COOKIE, cookieOptions());
  try {
    const result = await finishGithubLogin(req.query, readCookie(req.headers.cookie, GITHUB_COOKIE), requestContext(req));
    res.cookie(SESSION_COOKIE, result.token, cookieOptions(result.expiresAt));
  } catch (error) {
    const allowed = ['github_state_invalid', 'github_cancelled', 'github_email_required', 'github_email_taken', 'github_suspended', 'github_not_configured'];
    destination.searchParams.set('github_error', allowed.includes(error.code) ? error.code : 'github_unavailable');
    destination.hash = 'login';
  }
  res.redirect(303, destination.href);
}));

router.get('/me', authMiddleware, (req, res) => {
  const { id, email, role } = req.user;
  res.json({ user: { id, email, role } });
});

router.post('/logout', asyncRoute(async (req, res) => {
  const token = getSessionToken(req);
  if (token) await authSessionRepository.revoke(hashSessionToken(token));
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.status(204).end();
}));

export default router;
