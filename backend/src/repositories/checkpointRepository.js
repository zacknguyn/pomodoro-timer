import pool from '../lib/db.js';
import { ApiError, checkpointToApi, reviewEntryToApi } from '../lib/workspaceApi.js';

class CheckpointRepository {
  async findAll(userId, client = pool) {
    const { rows } = await client.query(
      `SELECT
         c.*,
         t.title AS task_title,
         t.status AS task_status,
         t.reference_url AS task_reference_url,
         s.started_at AS session_started_at,
         s.ended_at AS session_ended_at,
         s.duration_actual_seconds
       FROM checkpoints c
       JOIN tasks t ON t.id = c.task_id
       JOIN focus_sessions s ON s.id = c.session_id
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC, c.id DESC`
      , [userId]
    );
    return rows.map(reviewEntryToApi);
  }

  async findByTaskId(userId, taskId) {
    const { rows } = await pool.query(
      `SELECT * FROM checkpoints WHERE user_id = $1 AND task_id = $2 ORDER BY created_at DESC`,
      [userId, taskId]
    );
    return rows.map(checkpointToApi);
  }

  async create(userId, { taskId, sessionId, whatChanged, nextStep, outcome }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: taskRows } = await client.query(
        'SELECT id FROM tasks WHERE user_id = $1 AND id = $2 FOR UPDATE',
        [userId, taskId]
      );
      if (!taskRows[0]) throw new ApiError(404, 'Task not found', 'task_not_found');

      const { rows: sessionRows } = await client.query(
        'SELECT task_id, status FROM focus_sessions WHERE user_id = $1 AND id = $2 FOR UPDATE',
        [userId, sessionId]
      );
      const session = sessionRows[0];
      if (!session) throw new ApiError(404, 'Focus session not found', 'session_not_found');
      if (session.task_id !== taskId) {
        throw new ApiError(400, 'Checkpoint task does not match the focus session', 'task_session_mismatch');
      }
      if (session.status !== 'ended') {
        throw new ApiError(409, 'End the focus session before saving a checkpoint', 'session_not_ended');
      }

      const { rows } = await client.query(
        `INSERT INTO checkpoints (user_id, task_id, session_id, what_changed, next_step, outcome)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, taskId, sessionId, whatChanged || null, nextStep || null, outcome]
      );

      if (outcome === 'continue') {
        await client.query(`UPDATE tasks SET ready_order = ready_order + 1 WHERE user_id = $1 AND status = 'ready' AND id <> $2`, [userId, taskId]);
        await client.query(`UPDATE tasks SET status = 'ready', ready_order = 0 WHERE user_id = $1 AND id = $2`, [userId, taskId]);
      } else {
        await client.query(`UPDATE tasks SET status = 'done' WHERE user_id = $1 AND id = $2`, [userId, taskId]);
      }

      await client.query('COMMIT');
      return checkpointToApi(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new CheckpointRepository();
