import pool from '../lib/db.js';

class GroupRepository {
  async create(ownerId, name, repoFullName) {
    const { rows } = await pool.query(
      'INSERT INTO groups (name, repo_full_name, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, repoFullName, ownerId]
    );
    const group = rows[0];
    await this.addMember(group.id, ownerId, 'owner');
    return group;
  }

  async findById(id) {
    const { rows } = await pool.query('SELECT * FROM groups WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByRepo(repoFullName) {
    const { rows } = await pool.query('SELECT * FROM groups WHERE repo_full_name = $1', [repoFullName]);
    return rows[0] ?? null;
  }

  async findByUser(userId, status = null) {
    const query = status
      ? `SELECT g.* FROM groups g JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = $1 AND g.status = $2 ORDER BY g.created_at DESC`
      : `SELECT g.* FROM groups g JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = $1 ORDER BY g.created_at DESC`;
    const params = status ? [userId, status] : [userId];
    const { rows } = await pool.query(query, params);
    return rows;
  }

  async addMember(groupId, userId, role = 'member') {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [groupId, userId, role]
    );
  }

  async removeMember(groupId, userId) {
    await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  }

  async getMember(groupId, userId) {
    const { rows } = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    return rows[0] ?? null;
  }

  async getMembers(groupId) {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.avatar_style,
              gm.role, gm.joined_at,
              s2.github_username,
              COUNT(s.id) AS sessions_today,
              MAX(s.completed_at) AS last_session_at
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       LEFT JOIN settings s2 ON s2.user_id = u.id
       LEFT JOIN sessions s ON s.user_id = u.id
         AND s.completed_at::date = $1 AND s.mode = 'pomodoro'
       WHERE gm.group_id = $2
       GROUP BY u.id, u.email, u.display_name, u.avatar_style, gm.role, gm.joined_at, s2.github_username
       ORDER BY gm.role DESC, u.email`,
      [today, groupId]
    );
    return rows.map(m => ({
      ...m,
      name: m.display_name || m.email.split('@')[0],
      avatarStyle: m.avatar_style || 'thumbs',
      sessions_today: parseInt(m.sessions_today),
      isActive: m.last_session_at
        ? (Date.now() - new Date(m.last_session_at)) / 60000 < 30
        : false,
    }));
  }

  async setStatus(groupId, status) {
    const archivedAt = status === 'archived' ? new Date().toISOString() : null;
    await pool.query('UPDATE groups SET status = $1, archived_at = $2 WHERE id = $3', [status, archivedAt, groupId]);
  }

  async delete(groupId) {
    await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
  }

  async findActiveGroupsForRepos(repoFullNames) {
    if (!repoFullNames.length) return [];
    const placeholders = repoFullNames.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `SELECT * FROM groups WHERE repo_full_name IN (${placeholders}) AND status = 'active'`,
      repoFullNames
    );
    return rows;
  }
}

export default new GroupRepository();
