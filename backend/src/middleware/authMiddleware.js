import authSessionRepository, { hashSessionToken } from '../repositories/authSessionRepository.js';
import pool from '../lib/db.js';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Host-pomogit_session'
  : 'pomogit_session';

const DEV_BYPASS_AUTH = process.env.NODE_ENV !== 'production'
  && process.env.DEV_BYPASS_AUTH === 'true';
const LOCAL_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'local-preview@pomogit.invalid',
  role: 'user',
};

async function useLocalPreviewIdentity(req) {
  await pool.query(
    `INSERT INTO users (id, email, password, role)
     VALUES ($1, $2, $3, 'user')
     ON CONFLICT (id) DO NOTHING`,
    [LOCAL_USER.id, LOCAL_USER.email, '!local-preview-account-disabled!']
  );
  req.user = { userId: LOCAL_USER.id, ...LOCAL_USER };
}

function readCookie(header, name) {
  if (!header) return null;
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function getSessionToken(req) {
  return readCookie(req.headers.cookie, SESSION_COOKIE);
}

export const authMiddleware = async (req, res, next) => {
  if (DEV_BYPASS_AUTH) {
    try {
      await useLocalPreviewIdentity(req);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  const token = getSessionToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required', code: 'unauthorized' });

  try {
    const identity = await authSessionRepository.findActive(hashSessionToken(token));
    if (!identity || identity.banned) {
      return res.status(401).json({ error: 'Session expired', code: 'session_expired' });
    }
    req.authSessionId = identity.session_id;
    req.user = { userId: identity.id, id: identity.id, email: identity.email, role: identity.role };
    void authSessionRepository.touch(identity.session_id).catch(() => {});
    return next();
  } catch (error) {
    return next(error);
  }
};

export function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'Forbidden', code: 'forbidden' });
}
