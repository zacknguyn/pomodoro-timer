import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import pool from '../lib/db.js';

// One atomic counter across processes; database time determines the rolling window.
export async function sharedAuthLimiter(req, res, next) {
  // The Lambda adapter sets remoteAddress from API Gateway requestContext.http.sourceIp.
  // Forwarding headers are caller-controlled at the public API Gateway endpoint.
  const ip = process.env.AWS_LAMBDA_FUNCTION_NAME ? req.socket.remoteAddress : req.ip;
  if (!isIP(ip || '')) return res.status(503).json({ error: 'Authentication temporarily unavailable.' });
  const key = createHash('sha256').update(ip).digest('hex');
  try {
    const { rows: [row] } = await pool.query({
      text: `WITH expired AS (
        DELETE FROM auth_rate_limits WHERE key IN (
          SELECT key FROM auth_rate_limits WHERE expires_at <= NOW() AND key <> $1
          ORDER BY expires_at LIMIT 100
        )
      )
      INSERT INTO auth_rate_limits (key, hits, expires_at) VALUES ($1, 1, NOW() + INTERVAL '15 minutes')
      ON CONFLICT (key) DO UPDATE SET
        hits = CASE WHEN auth_rate_limits.expires_at <= NOW() THEN 1 ELSE LEAST(auth_rate_limits.hits + 1, 21) END,
        expires_at = CASE WHEN auth_rate_limits.expires_at <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE auth_rate_limits.expires_at END
      RETURNING hits, GREATEST(1, CEIL(EXTRACT(EPOCH FROM expires_at - NOW())))::int AS retry_after`,
      values: [key], query_timeout: 3000,
    });
    res.set({ 'RateLimit-Limit': '20', 'RateLimit-Remaining': String(Math.max(0, 20 - row.hits)), 'RateLimit-Reset': String(row.retry_after) });
    if (row.hits > 20) {
      return res.set('Retry-After', String(row.retry_after)).status(429).json({ error: 'Too many attempts, please try again later.' });
    }
    return next();
  } catch {
    // Fail closed, without leaking PostgreSQL details or falling back to worker-local memory.
    return res.status(503).json({ error: 'Authentication temporarily unavailable.' });
  }
}
