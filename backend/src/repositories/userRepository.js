import db from '../lib/db.js';
import { randomUUID } from 'node:crypto';

export class UserRepository {
  findById(id) {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  }

  findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
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
}

export default new UserRepository();
