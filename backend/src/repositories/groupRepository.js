import db from '../lib/db.js';
import { randomUUID } from 'node:crypto';

class GroupRepository {
  create(ownerId, name, repoFullName) {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO groups (id, name, repo_full_name, owner_id)
      VALUES (?, ?, ?, ?)
    `).run(id, name, repoFullName, ownerId);
    this.addMember(id, ownerId, 'owner');
    return this.findById(id);
  }

  findById(id) {
    return db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  }

  findByRepo(repoFullName) {
    return db.prepare('SELECT * FROM groups WHERE repo_full_name = ?').get(repoFullName);
  }

  findByUser(userId, status = null) {
    const query = status
      ? `SELECT g.* FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ? AND g.status = ?
         ORDER BY g.created_at DESC`
      : `SELECT g.* FROM groups g
         JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ?
         ORDER BY g.created_at DESC`;
    return status
      ? db.prepare(query).all(userId, status)
      : db.prepare(query).all(userId);
  }

  addMember(groupId, userId, role = 'member') {
    db.prepare(`
      INSERT OR IGNORE INTO group_members (group_id, user_id, role)
      VALUES (?, ?, ?)
    `).run(groupId, userId, role);
  }

  removeMember(groupId, userId) {
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  }

  getMember(groupId, userId) {
    return db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
  }

  getMembers(groupId) {
    const today = new Date().toISOString().slice(0, 10);
    return db.prepare(`
      SELECT u.id, u.email, u.display_name, u.avatar_style,
             gm.role, gm.joined_at,
             s2.github_username,
             COUNT(s.id) as sessions_today,
             MAX(s.completed_at) as last_session_at
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      LEFT JOIN settings s2 ON s2.user_id = u.id
      LEFT JOIN sessions s ON s.user_id = u.id AND date(s.completed_at) = ? AND s.mode = 'pomodoro'
      WHERE gm.group_id = ?
      GROUP BY u.id
      ORDER BY gm.role DESC, u.email
    `).all(today, groupId).map(m => ({
      ...m,
      name: m.display_name || m.email.split('@')[0],
      avatarStyle: m.avatar_style || 'thumbs',
      isActive: m.last_session_at
        ? (Date.now() - new Date(m.last_session_at)) / 60000 < 30
        : false,
    }));
  }

  setStatus(groupId, status) {
    const archivedAt = status === 'archived' ? new Date().toISOString() : null;
    db.prepare('UPDATE groups SET status = ?, archived_at = ? WHERE id = ?')
      .run(status, archivedAt, groupId);
  }

  delete(groupId) {
    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
  }

  // Find all active groups whose repo matches any of the given repo full_names
  findActiveGroupsForRepos(repoFullNames) {
    if (!repoFullNames.length) return [];
    const placeholders = repoFullNames.map(() => '?').join(',');
    return db.prepare(`
      SELECT * FROM groups
      WHERE repo_full_name IN (${placeholders}) AND status = 'active'
    `).all(...repoFullNames);
  }
}

export default new GroupRepository();
