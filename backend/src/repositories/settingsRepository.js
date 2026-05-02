import pool from '../lib/db.js';

const toClient = (row) => row ? ({
  pomodoro: row.pomodoro,
  shortBreak: row.short_break,
  longBreak: row.long_break,
  githubConnected: !!row.github_token,
}) : null;

class SettingsRepository {
  async findByUserId(userId) {
    const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [userId]);
    return toClient(rows[0]);
  }

  async findRawByUserId(userId) {
    const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [userId]);
    return rows[0] ?? null;
  }

  async getGithubToken(userId) {
    const { rows } = await pool.query('SELECT github_token FROM settings WHERE user_id = $1', [userId]);
    return rows[0]?.github_token ?? null;
  }

  async setGithubToken(userId, token) {
    await pool.query('UPDATE settings SET github_token = $1 WHERE user_id = $2', [token, userId]);
  }

  async setGithubUsername(userId, username) {
    await pool.query('UPDATE settings SET github_username = $1 WHERE user_id = $2', [username, userId]);
  }

  async getGithubUsername(userId) {
    const { rows } = await pool.query('SELECT github_username FROM settings WHERE user_id = $1', [userId]);
    return rows[0]?.github_username ?? null;
  }

  async update(userId, settings) {
    await pool.query(
      'UPDATE settings SET pomodoro = $1, short_break = $2, long_break = $3 WHERE user_id = $4',
      [settings.pomodoro, settings.shortBreak, settings.longBreak, userId]
    );
    return this.findByUserId(userId);
  }

  async clearGithub(userId) {
    await pool.query('UPDATE settings SET github_token = NULL, github_username = NULL WHERE user_id = $1', [userId]);
  }
}

export default new SettingsRepository();
