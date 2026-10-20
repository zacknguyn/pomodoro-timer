import pool from '../lib/db.js';

class UserRepository {
  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ?? null;
  }

  async setBanned(id, banned) {
    await pool.query('UPDATE users SET banned = $1 WHERE id = $2', [banned, id]);
  }

  async setRole(id, role) {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
  }

  async delete(id) {
    // Cascades handle sessions, settings, group_members via FK ON DELETE CASCADE
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
}

export default new UserRepository();
