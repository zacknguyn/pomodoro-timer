import pool from '../lib/db.js';

class UserRepository {
  async findAll() {
    const { rows } = await pool.query('SELECT id, email, banned, created_at FROM users ORDER BY created_at DESC');
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByEmail(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ?? null;
  }

  async findByUsername(username) {
    const { rows } = await pool.query("SELECT * FROM users WHERE email LIKE $1", [`${username}@%`]);
    return rows[0] ?? null;
  }

  async create({ email, password }) {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, password]
    );
    const user = rows[0];
    await pool.query('INSERT INTO settings (user_id) VALUES ($1)', [user.id]);
    return user;
  }

  async updateProfile(id, { displayName, bio, avatarStyle }) {
    await pool.query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        bio = COALESCE($2, bio),
        avatar_style = COALESCE($3, avatar_style)
       WHERE id = $4`,
      [displayName ?? null, bio ?? null, avatarStyle ?? null, id]
    );
  }

  async setBanned(id, banned) {
    await pool.query('UPDATE users SET banned = $1 WHERE id = $2', [banned, id]);
  }

  async delete(id) {
    // Cascades handle sessions, settings, group_members via FK ON DELETE CASCADE
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
}

export default new UserRepository();
