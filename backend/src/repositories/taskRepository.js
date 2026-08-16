import pool from '../lib/db.js';
import { taskToApi } from '../lib/workspaceApi.js';

class TaskRepository {
  async findAll(status = null) {
    const query = status
      ? `SELECT * FROM tasks WHERE status = $1
         ORDER BY CASE WHEN status = 'ready' THEN ready_order END ASC, created_at ASC`
      : `SELECT * FROM tasks
         ORDER BY CASE status WHEN 'ready' THEN 0 WHEN 'inbox' THEN 1 ELSE 2 END,
                  ready_order ASC, created_at ASC`;
    const { rows } = await pool.query(query, status ? [status] : []);
    return rows.map(taskToApi);
  }

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM tasks WHERE id = $1', [id]);
    return taskToApi(rows[0]);
  }

  async create({ title, status, order, referenceUrl }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let readyOrder = order;
      if (status === 'ready' && readyOrder === undefined) {
        const { rows: [position] } = await client.query(
          `SELECT COALESCE(MAX(ready_order), -1) + 1 AS next_order
           FROM tasks WHERE status = 'ready'`
        );
        readyOrder = Number(position.next_order);
      }
      const { rows } = await client.query(
        `INSERT INTO tasks (title, status, ready_order, reference_url)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [title, status, readyOrder ?? 0, referenceUrl || null]
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

  async update(id, changes) {
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

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return taskToApi(rows[0]);
  }

  async delete(id) {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return result.rowCount > 0;
  }
}

export default new TaskRepository();
