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
      totalFocusMinutes: totalFocus.total,
    };
  }

  getHeatmap(userId) {
    // Returns array of 364 values (0-3) representing daily session intensity
    const rows = db.prepare(`
      SELECT date(completed_at) as day, COUNT(*) as count
      FROM sessions
      WHERE user_id = ? AND mode = 'pomodoro'
        AND completed_at >= date('now', '-364 days')
      GROUP BY day
    `).all(userId);

    const map = {};
    rows.forEach(r => { map[r.day] = r.count; });

    const result = [];
    for (let i = 363; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = map[key] || 0;
      result.push(Math.min(count >= 4 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0, 3));
    }
    return result;
  }
}

export default new SessionRepository();
