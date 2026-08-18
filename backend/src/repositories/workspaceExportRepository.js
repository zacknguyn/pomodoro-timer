import pool from '../lib/db.js';
import { checkpointToApi, sessionToApi, taskToApi } from '../lib/workspaceApi.js';

class WorkspaceExportRepository {
  async createSnapshot(userId, client = pool, now = new Date()) {
    const { rows: taskRows } = await client.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at, id',
      [userId]
    );
    const { rows: sessionRows } = await client.query(
      'SELECT * FROM focus_sessions WHERE user_id = $1 ORDER BY started_at, id',
      [userId]
    );
    const { rows: checkpointRows } = await client.query(
      'SELECT * FROM checkpoints WHERE user_id = $1 ORDER BY created_at, id',
      [userId]
    );

    return {
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      tasks: taskRows.map(taskToApi),
      focusSessions: sessionRows.map(sessionToApi),
      checkpoints: checkpointRows.map(checkpointToApi),
    };
  }
}

export default new WorkspaceExportRepository();
