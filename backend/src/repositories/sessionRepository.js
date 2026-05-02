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

  delete(id, userId) {
    db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(id, userId);
  }

  findByDate(userId, date) {
    // date = YYYY-MM-DD
    const stmt = db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ? AND date(completed_at) = ?
      ORDER BY completed_at DESC
    `);
    return stmt.all(userId, date);
  }

  getStats(userId, tzOffset = 0) {
    const sign = tzOffset >= 0 ? '+' : '-';
    const absH = Math.abs(tzOffset);
    const tzMod = `${sign}${absH} hours`;

    const totalSessions = db.prepare(
      "SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND mode = 'pomodoro'"
    ).get(userId);
    const totalFocus = db.prepare(
      "SELECT COALESCE(SUM(duration), 0) as total FROM sessions WHERE user_id = ? AND mode = 'pomodoro'"
    ).get(userId);

    // Streak: consecutive days with at least one pomodoro session (in user's local timezone)
    const days = db.prepare(`
      SELECT DISTINCT date(completed_at, '${tzMod}') as day
      FROM sessions WHERE user_id = ? AND mode = 'pomodoro'
      ORDER BY day DESC
    `).all(userId).map(r => r.day);

    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    // today/yesterday in user's local time
    const nowLocal = new Date(Date.now() + tzOffset * 3600000);
    const today = nowLocal.toISOString().slice(0, 10);
    const yesterday = new Date(nowLocal - 86400000).toISOString().slice(0, 10);

    for (let i = 0; i < days.length; i++) {
      if (i === 0) {
        if (days[0] !== today && days[0] !== yesterday) break;
        streak = 1;
      } else {
        const prev = new Date(days[i - 1]);
        const curr = new Date(days[i]);
        const diff = (prev - curr) / 86400000;
        if (diff === 1) streak++;
        else break;
      }
    }
    currentStreak = streak;

    let run = 0;
    for (let i = 0; i < days.length; i++) {
      if (i === 0) { run = 1; }
      else {
        const prev = new Date(days[i - 1]);
        const curr = new Date(days[i]);
        (prev - curr) / 86400000 === 1 ? run++ : (longestStreak = Math.max(longestStreak, run), run = 1);
      }
    }
    longestStreak = Math.max(longestStreak, run);

    return {
      totalSessions: totalSessions.count,
      totalFocusMinutes: totalFocus.total,
      currentStreak,
      longestStreak,
    };
  }

  getHeatmap(userId, tzOffset = 0) {
    const sign = tzOffset >= 0 ? '+' : '-';
    const absH = Math.abs(tzOffset);
    const tzMod = `${sign}${absH} hours`;

    const rows = db.prepare(`
      SELECT date(completed_at, '${tzMod}') as day, COUNT(*) as count
      FROM sessions
      WHERE user_id = ? AND mode = 'pomodoro'
        AND date(completed_at, '${tzMod}') >= date('now', '${tzMod}', '-364 days')
      GROUP BY day
    `).all(userId);

    const map = {};
    rows.forEach(r => { map[r.day] = r.count; });

    const result = [];
    for (let i = 363; i >= 0; i--) {
      const d = new Date(Date.now() + tzOffset * 3600000);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = map[key] || 0;
      const level = count >= 4 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0;
      result.push({ date: key, level, count });
    }
    return result;
  }
}

export default new SessionRepository();
