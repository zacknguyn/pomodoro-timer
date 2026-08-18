import pool from '../lib/db.js';
import { taskToApi } from '../lib/workspaceApi.js';

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

  async create(userId, { title, status, order, referenceUrl }) {
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
        `INSERT INTO tasks (user_id, title, status, ready_order, reference_url)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, title, status, readyOrder ?? 0, referenceUrl || null]
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
    const assignments = [];
    const values = [];
    const fields = {
      title: 'title',
      status: 'status',
      order: 'ready_order',
      referenceUrl: 'reference_url',
    };

    Object.entries(fields).forEach(([property, column]) => {
      if (changes[property] === undefined) return;
      values.push(changes[property] === '' ? null : changes[property]);
      assignments.push(`${column} = $${values.length}`);
    });

    values.push(userId, id);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${assignments.join(', ')}
       WHERE user_id = $${values.length - 1} AND id = $${values.length} RETURNING *`,
      values
    );
    return taskToApi(rows[0]);
  }

  async delete(userId, id) {
    const result = await pool.query('DELETE FROM tasks WHERE user_id = $1 AND id = $2', [userId, id]);
    return result.rowCount > 0;
  }
}

export default new TaskRepository();
