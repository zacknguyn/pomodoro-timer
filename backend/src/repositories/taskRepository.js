import pool from '../lib/db.js';
import { randomUUID } from 'node:crypto';
import { ApiError, taskToApi } from '../lib/workspaceApi.js';

class TaskRepository {
  async findAll(userId, status = null) {
    const query = status
      ? `SELECT * FROM tasks WHERE user_id = $1 AND status = $2
         ORDER BY CASE WHEN status = 'ready' THEN ready_order END ASC, created_at ASC`
      : `SELECT * FROM tasks WHERE user_id = $1
         ORDER BY CASE status WHEN 'ready' THEN 0 WHEN 'inbox' THEN 1 ELSE 2 END,
                  ready_order ASC, created_at ASC`;
    const { rows } = await pool.query(query, status ? [userId, status] : [userId]);
    return rows.map(taskToApi);
  }

  async findById(userId, id, client = pool) {
    const { rows } = await client.query('SELECT * FROM tasks WHERE user_id = $1 AND id = $2', [userId, id]);
    return taskToApi(rows[0]);
  }

  async create(userId, { title, status = 'inbox', order, referenceUrl, project = '', nextStep = '', notes = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let readyOrder = order;
      if (status === 'ready' && readyOrder === undefined) {
        const { rows: [position] } = await client.query(
          `SELECT COALESCE(MAX(ready_order), -1) + 1 AS next_order
           FROM tasks WHERE user_id = $1 AND status = 'ready'`,
          [userId]
        );
        readyOrder = Number(position.next_order);
      }
      const { rows } = await client.query(
        `INSERT INTO tasks (user_id, title, status, ready_order, reference_url, project, next_step, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [userId, title, status, readyOrder ?? 0, referenceUrl || null, project, nextStep, JSON.stringify(notes)]
      );
      await client.query('COMMIT');
      return taskToApi(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(userId, id, changes) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [task] } = await client.query('SELECT * FROM tasks WHERE user_id = $1 AND id = $2 FOR UPDATE', [userId, id]);
      if (!task) { await client.query('COMMIT'); return null; }
      const next = { ...changes };
      if (next.status && next.status !== task.status) {
        const { rows } = await client.query("SELECT id FROM focus_sessions WHERE user_id = $1 AND task_id = $2 AND status IN ('active', 'paused')", [userId, id]);
        if (rows.length) throw new ApiError(409, 'Stop the timer before changing this task’s status.', 'task_has_open_session');
        next.notes = [...(next.notes || task.notes), { id: randomUUID(), text: `Moved from ${task.status} to ${next.status}.`, createdAt: new Date().toISOString(), kind: 'change' }];
      }
      const fields = { title: 'title', status: 'status', order: 'ready_order', referenceUrl: 'reference_url', project: 'project', nextStep: 'next_step', notes: 'notes' };
      const assignments = [];
      const values = [];
      for (const [property, column] of Object.entries(fields)) {
        if (next[property] === undefined) continue;
        values.push(property === 'notes' ? JSON.stringify(next.notes) : property === 'referenceUrl' ? next[property] || null : next[property]);
        assignments.push(`${column} = $${values.length}`);
      }
      values.push(userId, id);
      const { rows } = await client.query(`UPDATE tasks SET ${assignments.join(', ')} WHERE user_id = $${values.length - 1} AND id = $${values.length} RETURNING *`, values);
      await client.query('COMMIT');
      return taskToApi(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(userId, id) {
    const result = await pool.query("DELETE FROM tasks WHERE user_id = $1 AND id = $2 AND NOT EXISTS (SELECT 1 FROM focus_sessions WHERE user_id = $1 AND task_id = $2 AND status IN ('active', 'paused'))", [userId, id]);
    if (!result.rowCount && await this.findById(userId, id)) throw new ApiError(409, 'Stop the timer before deleting this task.', 'task_has_open_session');
    return result.rowCount > 0;
  }
}

export default new TaskRepository();
