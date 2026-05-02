import db from '../lib/db.js';

const toClient = (row) => row ? ({
  pomodoro: row.pomodoro,
  shortBreak: row.short_break,
  longBreak: row.long_break,
  githubConnected: !!row.github_token,
}) : null;

export class SettingsRepository {
  findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM settings WHERE user_id = ?');
    return toClient(stmt.get(userId));
  }

  findRawByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM settings WHERE user_id = ?');
    return stmt.get(userId);
  }

  getGithubToken(userId) {
    const row = db.prepare('SELECT github_token FROM settings WHERE user_id = ?').get(userId);
    return row?.github_token ?? null;
  }

  setGithubToken(userId, token) {
    db.prepare('UPDATE settings SET github_token = ? WHERE user_id = ?').run(token, userId);
  }

  setGithubUsername(userId, username) {
    db.prepare('UPDATE settings SET github_username = ? WHERE user_id = ?').run(username, userId);
  }

  getGithubUsername(userId) {
    const row = db.prepare('SELECT github_username FROM settings WHERE user_id = ?').get(userId);
    return row?.github_username ?? null;
  }

  update(userId, settings) {
    db.prepare(`
      UPDATE settings SET pomodoro = ?, short_break = ?, long_break = ? WHERE user_id = ?
    `).run(settings.pomodoro, settings.shortBreak, settings.longBreak, userId);
    return this.findByUserId(userId);
  }

  clearGithub(userId) {
    db.prepare('UPDATE settings SET github_token = NULL, github_username = NULL WHERE user_id = ?').run(userId);
  }
}

export default new SettingsRepository();
