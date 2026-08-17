import pool from '../lib/db.js';
import { ApiError, sessionToApi } from '../lib/workspaceApi.js';

class FocusSessionRepository {
  async findOpen(client = pool) {
    const { rows } = await client.query(
      `SELECT * FROM focus_sessions
       WHERE status IN ('active', 'paused')
       ORDER BY started_at DESC LIMIT 1`
    );
    return sessionToApi(rows[0]);
  }

  async findById(id, client = pool, lock = false) {
    const { rows } = await client.query(
      `SELECT * FROM focus_sessions WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create({ taskId, durationPlannedSeconds }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: taskRows } = await client.query(
        'SELECT id, status FROM tasks WHERE id = $1 FOR UPDATE',
        [taskId]
      );
      if (!taskRows[0]) throw new ApiError(404, 'Task not found', 'task_not_found');
      if (taskRows[0].status === 'done') {
        throw new ApiError(409, 'A completed task must be reopened before focusing', 'task_completed');
      }

      const open = await this.findOpen(client);
      if (open) {
        throw new ApiError(409, 'A focus session is already active or paused', 'active_session_exists');
      }

      const deadline = new Date(Date.now() + durationPlannedSeconds * 1000);
      const { rows } = await client.query(
        `INSERT INTO focus_sessions (
           task_id, duration_planned_seconds, duration_actual_seconds,
           status, deadline_at, remaining_seconds
         ) VALUES ($1, $2, 0, 'active', $3, $2) RETURNING *`,
        [taskId, durationPlannedSeconds, deadline]
      );
      await client.query('COMMIT');
      return sessionToApi(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async transition(id, action) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const session = await this.findById(id, client, true);
      if (!session) throw new ApiError(404, 'Focus session not found', 'session_not_found');

      const now = new Date();
      let next;
      if (action === 'pause') next = await this.pause(client, session, now);
      if (action === 'resume') next = await this.resume(client, session, now);
      if (action === 'end') next = await this.end(client, session, now);

      await client.query('COMMIT');
      return sessionToApi(next);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async pause(client, session, now) {
    if (session.status !== 'active') {
      throw new ApiError(409, 'Only an active session can be paused', 'invalid_session_transition');
    }
    const remaining = Math.max(0, Math.ceil((new Date(session.deadline_at).getTime() - now.getTime()) / 1000));
    const actual = Math.max(0, Math.min(session.duration_planned_seconds, session.duration_planned_seconds - remaining));
    const { rows } = await client.query(
      `UPDATE focus_sessions
       SET status = 'paused', deadline_at = NULL,
           remaining_seconds = $1, duration_actual_seconds = $2
       WHERE id = $3 RETURNING *`,
      [remaining, actual, session.id]
    );
    return rows[0];
  }

  async resume(client, session, now) {
    if (session.status !== 'paused') {
      throw new ApiError(409, 'Only a paused session can be resumed', 'invalid_session_transition');
    }
    const deadline = new Date(now.getTime() + session.remaining_seconds * 1000);
    const { rows } = await client.query(
      `UPDATE focus_sessions
       SET status = 'active', deadline_at = $1
       WHERE id = $2 RETURNING *`,
      [deadline, session.id]
    );
    return rows[0];
  }

  async end(client, session, now) {
    if (!['active', 'paused'].includes(session.status)) {
      throw new ApiError(409, 'This focus session has already ended', 'invalid_session_transition');
    }
    const remaining = session.status === 'paused'
      ? session.remaining_seconds
      : Math.max(0, Math.ceil((new Date(session.deadline_at).getTime() - now.getTime()) / 1000));
    const actual = Math.max(0, Math.min(session.duration_planned_seconds, session.duration_planned_seconds - remaining));
    const { rows } = await client.query(
      `UPDATE focus_sessions
       SET status = 'ended', ended_at = $1, deadline_at = NULL,
           remaining_seconds = $2, duration_actual_seconds = $3
       WHERE id = $4 RETURNING *`,
      [now, remaining, actual, session.id]
    );
    return rows[0];
  }
}

export default new FocusSessionRepository();
