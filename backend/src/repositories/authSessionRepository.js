import pool from '../lib/db.js';

// Administrative revocation targets the same sessions owned by Better Auth.
export default {
  revokeAllForUser: userId => pool.query('DELETE FROM better_auth_sessions WHERE user_id=$1', [userId]),
};
