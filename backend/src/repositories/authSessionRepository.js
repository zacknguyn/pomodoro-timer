import crypto from 'node:crypto';
import pool from '../lib/db.js';

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

class AuthSessionRepository {
  async create({ userId, tokenHash, expiresAt, userAgent, ipAddress }) {
    await pool.query(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null]
    );
  }

  async findActive(tokenHash) {
    const { rows } = await pool.query(
      `SELECT s.id AS session_id, s.expires_at,
              u.id, u.email, u.role, u.banned
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [tokenHash]
    );
    return rows[0] ?? null;
  }

  async touch(id) {
    await pool.query('UPDATE auth_sessions SET last_seen_at = NOW() WHERE id = $1', [id]);
  }

  async revoke(tokenHash) {
    await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash]);
  }

  async revokeAllForUser(userId) {
    await pool.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
  }

  async deleteExpired() {
    await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
  }
}

export default new AuthSessionRepository();
