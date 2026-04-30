import db from '../lib/db.js';

export class SettingsRepository {
  findByUserId(userId) {
    const stmt = db.prepare('SELECT * FROM settings WHERE user_id = ?');
    return stmt.get(userId);
  }

  update(userId, settings) {
    const stmt = db.prepare(`
      UPDATE settings 
      SET pomodoro = ?, short_break = ?, long_break = ?
      WHERE user_id = ?
    `);
    stmt.run(settings.pomodoro, settings.shortBreak, settings.longBreak, userId);
    return this.findByUserId(userId);
  }
}

export default new SettingsRepository();
