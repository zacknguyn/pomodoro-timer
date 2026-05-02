import db from '../lib/db.js';
import { randomUUID } from 'node:crypto';

export class UserRepository {
  findAll() {
    return db.prepare('SELECT id, email FROM users ORDER BY email').all();
  }

  findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  }

  findByUsername(username) {
    // username = email prefix (before @)
    const stmt = db.prepare("SELECT * FROM users WHERE email LIKE ?");
    return stmt.get(`${username}@%`);
  }

  create(user) {
    const id = randomUUID();
    const stmt = db.prepare('INSERT INTO users (id, email, password) VALUES (?, ?, ?)');
    stmt.run(id, user.email, user.password);
    
    // Create default settings
    const settingsStmt = db.prepare('INSERT INTO settings (user_id) VALUES (?)');
    settingsStmt.run(id);

    return { id, email: user.email };
  }

  updateProfile(id, { displayName, bio, avatarStyle }) {
    db.prepare(`
      UPDATE users SET
        display_name = COALESCE(?, display_name),
        bio = COALESCE(?, bio),
        avatar_style = COALESCE(?, avatar_style)
      WHERE id = ?
    `).run(displayName ?? null, bio ?? null, avatarStyle ?? null, id);
  }

  setBanned(id, banned) {
    db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(banned ? 1 : 0, id);
  }

  delete(id) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM settings WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM group_members WHERE user_id = ?').run(id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
}

export default new UserRepository();
