import db from '../lib/db.js';
import { randomUUID } from 'node:crypto';

export class SessionRepository {
  create(session) {
    const id = randomUUID();
    const stmt = db.prepare(`
      INSERT INTO sessions (id, user_id, mode, duration, intent, repo_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, session.userId, session.mode, session.duration, session.intent, session.repoName);
    return { id, ...session };
  }

  findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY completed_at DESC');
    return stmt.all(userId);
  }

  getStats(userId) {
    const totalSessions = db.prepare(
      "SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND mode = 'pomodoro'"
    ).get(userId);
    const totalFocus = db.prepare(
      "SELECT COALESCE(SUM(duration), 0) as total FROM sessions WHERE user_id = ? AND mode = 'pomodoro'"
    ).get(userId);
    return {
      totalSessions: totalSessions.count,
      totalFocusSeconds: totalFocus.total,
    };
  }
}

export default new SessionRepository();
