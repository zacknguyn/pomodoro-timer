import { Router } from 'express';
import { z } from 'zod';
import { getAuth, authHeaders, SESSION_COOKIE } from '../lib/auth.js';
import { authMiddleware, getSessionToken } from '../middleware/authMiddleware.js';
import { ApiError, asyncRoute } from '../lib/workspaceApi.js';

const router = Router();
const credentials = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).strict();
const origin = () => process.env.FRONTEND_URL || 'http://localhost:5173';
const publicUser = user => ({ id: user.id, email: user.email, role: user.role || 'user' });
function cookies(response, res) {
  const values = response.headers.getSetCookie();
  if (values.length) res.setHeader('Set-Cookie', values);
}
async function invoke(req, path, body) {
  const headers = authHeaders(req);
  if (body) headers.set('content-type', 'application/json');
  return getAuth().handler(new Request(`${process.env.API_URL || origin()}/api/auth${path}`, {
    method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}),
  }));
}
async function authenticate(req, res, mode) {
  const input = (mode === 'register' ? credentials.extend({ password: z.string().min(12, 'Use at least 12 characters').max(128) }) : credentials).parse(req.body);
  input.email = input.email.toLowerCase();
  const response = await invoke(req, mode === 'register' ? '/sign-up/email' : '/sign-in/email', {
    ...input, ...(mode === 'register' ? { name: input.email.split('@')[0] } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const duplicate = ['USER_ALREADY_EXISTS', 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'].includes(data.code);
    const status = duplicate ? 409 : response.status;
    return res.status(status).json({ error: status >= 500 ? 'Authentication temporarily unavailable.' : data.message || 'Sign-in failed.' });
  }
  cookies(response, res);
  // Better Auth's raw session token is never included in our browser JSON contract.
  return res.status(mode === 'register' ? 201 : 200).json({ user: publicUser(data.user) });
}
router.post('/register', asyncRoute((req, res) => authenticate(req, res, 'register')));
router.post('/login', asyncRoute((req, res) => authenticate(req, res, 'login')));
router.post('/github', asyncRoute(async (req, res) => {
  if (![process.env.GITHUB_CLIENT_ID, process.env.GITHUB_CLIENT_SECRET, process.env.GITHUB_CALLBACK_URL].every(Boolean)) {
    throw new ApiError(503, 'GitHub sign-in is not configured yet.', 'github_not_configured');
  }
  const response = await invoke(req, '/sign-in/social', {
    provider: 'github', disableRedirect: true,
    callbackURL: `${origin()}/#work`, errorCallbackURL: `${origin()}/?github_error=github_unavailable#login`,
  });
  if (!response.ok) throw new ApiError(503, 'GitHub sign-in is temporarily unavailable.', 'github_unavailable');
  cookies(response, res);
  res.json({ authorizationUrl: (await response.json()).url });
}));
router.get('/github/callback', asyncRoute(async (req, res) => {
  const destination = new URL('/#login', origin());
  try {
    const query = z.object({ state: z.string().min(1).max(512), code: z.string().max(512).optional(), error: z.string().max(200).optional() }).parse(req.query);
    const response = await invoke(req, `/callback/github?${new URLSearchParams(query)}`);
    cookies(response, res);
    const location = response.headers.get('location');
    if (location) {
      const redirect = new URL(location, origin());
      const error = redirect.searchParams.get('error');
      if (!error && redirect.origin === origin() && redirect.hash === '#work') return res.redirect(303, redirect.href);
      const codes = { state_mismatch: 'github_state_invalid', state_not_found: 'github_state_invalid', state_invalid: 'github_state_invalid', access_denied: 'github_cancelled', account_not_linked: 'github_email_taken', github_email_required: 'github_email_required', github_suspended: 'github_suspended' };
      destination.searchParams.set('github_error', codes[error] || 'github_unavailable');
    } else destination.searchParams.set('github_error', 'github_unavailable');
  } catch {
    destination.searchParams.set('github_error', 'github_unavailable');
  }
  return res.redirect(303, destination.href);
}));
router.get('/me', authMiddleware, (req, res) => res.json({ user: publicUser(req.user) }));
router.post('/logout', asyncRoute(async (req, res) => {
  if (!getSessionToken(req)) {
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    return res.status(204).end();
  }
  const response = await invoke(req, '/sign-out', {});
  if (!response.ok) throw new ApiError(503, 'Sign-out temporarily unavailable. Try again.', 'logout_unavailable');
  if (await getAuth().api.getSession({ headers: authHeaders(req) })) throw new ApiError(503, 'Sign-out temporarily unavailable. Try again.', 'logout_unavailable');
  cookies(response, res);
  // Also clear unsigned pre-migration cookies; they cannot authenticate with Better Auth.
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  res.status(204).end();
}));

export default router;
