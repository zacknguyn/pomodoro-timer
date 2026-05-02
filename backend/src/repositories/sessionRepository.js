import pool from '../lib/db.js';

class SessionRepository {
  async create(session) {
    const { rows } = await pool.query(
      `INSERT INTO sessions (user_id, mode, duration, intent, repo_name, note)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [session.userId, session.mode, session.duration, session.intent ?? null, session.repoName ?? null, session.note ?? null]
    );
    return rows[0];
  }

  async findByUserId(userId) {
    const { rows } = await pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 ORDER BY completed_at DESC',
      [userId]
    );
    return rows;
  }

  async delete(id, userId) {
    await pool.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [id, userId]);
  }

  async findByDate(userId, date) {
    const { rows } = await pool.query(
      `SELECT * FROM sessions WHERE user_id = $1 AND completed_at::date = $2 ORDER BY completed_at DESC`,
      [userId, date]
    );
    return rows;
  }

  async getStats(userId, tzOffsetHours = 0) {
    const tz = tzOffsetHours >= 0 ? `+${tzOffsetHours}` : `${tzOffsetHours}`;
    const interval = `${Math.abs(tzOffsetHours)} hours`;
    const sign = tzOffsetHours >= 0 ? '+' : '-';

    const { rows: [totals] } = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE mode = 'pomodoro') AS total_sessions,
        COALESCE(SUM(duration) FILTER (WHERE mode = 'pomodoro'), 0) AS total_focus
       FROM sessions WHERE user_id = $1`,
      [userId]
    );

    // Streak: consecutive days with ≥1 pomodoro in user's local time
    const { rows: days } = await pool.query(
      `SELECT DISTINCT (completed_at AT TIME ZONE 'UTC' + INTERVAL '${sign}${interval}')::date AS day
       FROM sessions WHERE user_id = $1 AND mode = 'pomodoro'
       ORDER BY day DESC`,
      [userId]
    );
    const dayList = days.map(r => r.day.toISOString().slice(0, 10));

    const nowLocal = new Date(Date.now() + tzOffsetHours * 3600000);
    const today = nowLocal.toISOString().slice(0, 10);
    const yesterday = new Date(nowLocal - 86400000).toISOString().slice(0, 10);

    let currentStreak = 0, longestStreak = 0, run = 0;
    for (let i = 0; i < dayList.length; i++) {
      if (i === 0) {
        if (dayList[0] !== today && dayList[0] !== yesterday) break;
        run = 1;
      } else {
        const diff = (new Date(dayList[i - 1]) - new Date(dayList[i])) / 86400000;
        diff === 1 ? run++ : (longestStreak = Math.max(longestStreak, run), run = 1);
      }
    }
    currentStreak = run;
    longestStreak = Math.max(longestStreak, run);

    return {
      totalSessions: parseInt(totals.total_sessions),
      totalFocusMinutes: parseInt(totals.total_focus),
      currentStreak,
      longestStreak,
    };
  }

  async getHeatmap(userId, tzOffsetHours = 0) {
    const sign = tzOffsetHours >= 0 ? '+' : '-';
    const interval = `${Math.abs(tzOffsetHours)} hours`;

    const { rows } = await pool.query(
      `SELECT (completed_at AT TIME ZONE 'UTC' + INTERVAL '${sign}${interval}')::date AS day,
              COUNT(*) AS count
       FROM sessions
       WHERE user_id = $1 AND mode = 'pomodoro'
         AND completed_at >= NOW() - INTERVAL '364 days'
       GROUP BY day`,
      [userId]
    );

    const map = {};
    rows.forEach(r => { map[r.day.toISOString().slice(0, 10)] = parseInt(r.count); });

    const result = [];
    for (let i = 363; i >= 0; i--) {
      const d = new Date(Date.now() + tzOffsetHours * 3600000);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = map[key] || 0;
      result.push({ date: key, level: count >= 4 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0, count });
    }
    return result;
  }
}

export default new SessionRepository();
