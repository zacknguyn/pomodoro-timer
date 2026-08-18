const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export class WorkApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'WorkApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new WorkApiError(payload?.error || 'The workspace could not be updated.', response.status)
  }

  return response.status === 204 ? null : response.json()
}

export const workApi = {
  exportWorkspace: () => request('/export'),
  listTasks: () => request('/tasks'),
  createTask: (task) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),
  updateTask: (taskId, changes) => request(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  }),
  getActiveSession: () => request('/sessions/active'),
  createSession: (taskId, durationPlannedSeconds) => request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ taskId, durationPlannedSeconds }),
  }),
  transitionSession: (sessionId, action) => request(`/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  }),
  createCheckpoint: (checkpoint) => request('/checkpoints', {
    method: 'POST',
    body: JSON.stringify(checkpoint),
  }),
  getTaskCheckpoints: (taskId) => request(`/tasks/${taskId}/checkpoints`),
}
