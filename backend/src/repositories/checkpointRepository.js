import pool from '../lib/db.js';
import { ApiError, checkpointToApi } from '../lib/workspaceApi.js';

class CheckpointRepository {
  async findByTaskId(taskId) {
    const { rows } = await pool.query(
      `SELECT * FROM checkpoints WHERE task_id = $1 ORDER BY created_at DESC`,
      [taskId]
    );
    return rows.map(checkpointToApi);
  }

  async create({ taskId, sessionId, whatChanged, nextStep, outcome }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: taskRows } = await client.query(
        'SELECT id FROM tasks WHERE id = $1 FOR UPDATE',
        [taskId]
      );
      if (!taskRows[0]) throw new ApiError(404, 'Task not found', 'task_not_found');

      const { rows: sessionRows } = await client.query(
        'SELECT task_id, status FROM focus_sessions WHERE id = $1 FOR UPDATE',
        [sessionId]
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
        `INSERT INTO checkpoints (task_id, session_id, what_changed, next_step, outcome)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [taskId, sessionId, whatChanged || null, nextStep || null, outcome]
      );

      if (outcome === 'continue') {
        await client.query(`UPDATE tasks SET ready_order = ready_order + 1 WHERE status = 'ready' AND id <> $1`, [taskId]);
        await client.query(`UPDATE tasks SET status = 'ready', ready_order = 0 WHERE id = $1`, [taskId]);
      } else {
        await client.query(`UPDATE tasks SET status = 'done' WHERE id = $1`, [taskId]);
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
