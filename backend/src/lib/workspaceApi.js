import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(status, message, code = 'request_failed') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function workspaceErrorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: error.issues[0]?.message || 'Invalid request',
      code: 'validation_failed',
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: error.message, code: error.code });
  }

  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message, code: 'request_rejected' });
  }

  if (error?.code === '23505' && error?.constraint === 'users_email_key') {
    return res.status(409).json({ error: 'An account with this email already exists', code: 'email_taken' });
  }

  if (error?.code === '23505' && error?.constraint === 'focus_sessions_one_open_idx') {
    return res.status(409).json({
      error: 'A focus session is already active or paused',
      code: 'active_session_exists',
    });
  }

  if (error?.code === '23505' && error?.constraint === 'checkpoints_session_id_key') {
    return res.status(409).json({
      error: 'This focus session already has a checkpoint',
      code: 'checkpoint_exists',
    });
  }

  console.error(error);
  return res.status(500).json({ error: 'Internal server error', code: 'internal_error' });
}

export function taskToApi(row) {
  return row ? {
    id: row.id,
    title: row.title,
    status: row.status,
    order: row.ready_order,
    referenceUrl: row.reference_url,
    createdAt: row.created_at,
  } : null;
}

export function sessionToApi(row) {
  return row ? {
    id: row.id,
    taskId: row.task_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationPlannedSeconds: row.duration_planned_seconds,
    durationActualSeconds: row.duration_actual_seconds,
    status: row.status,
    deadlineAt: row.deadline_at,
    remainingSeconds: row.remaining_seconds,
  } : null;
}

export function checkpointToApi(row) {
  return row ? {
    id: row.id,
    taskId: row.task_id,
    sessionId: row.session_id,
    whatChanged: row.what_changed,
    nextStep: row.next_step,
    outcome: row.outcome,
    createdAt: row.created_at,
  } : null;
}

export function reviewEntryToApi(row) {
  return row ? {
    id: row.id,
    outcome: row.outcome,
    whatChanged: row.what_changed,
    nextStep: row.next_step,
    createdAt: row.created_at,
    task: {
      id: row.task_id,
      title: row.task_title,
      status: row.task_status,
      referenceUrl: row.task_reference_url,
    },
    session: {
      id: row.session_id,
      startedAt: row.session_started_at,
      endedAt: row.session_ended_at,
      durationActualSeconds: row.duration_actual_seconds,
    },
  } : null;
}
