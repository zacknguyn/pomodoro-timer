const API_BASE = import.meta.env.VITE_API_URL || '/api'
const REQUEST_TIMEOUT_MS = 12_000

export class WorkApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'WorkApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      signal: options.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new WorkApiError('The workspace took too long to respond. Try again.')
    }
    throw new WorkApiError('The workspace could not connect to the local API.')
  } finally {
    window.clearTimeout(timeout)
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    if (response.status === 401) window.dispatchEvent(new CustomEvent('pomogit:auth-expired'))
    throw new WorkApiError(payload?.error || 'The workspace could not be updated.', response.status)
  }

  return response.status === 204 ? null : response.json()
}

export const workApi = {
  exportWorkspace: () => request('/export'),
  listReviewEntries: () => request('/checkpoints'),
  listTasks: () => request('/tasks'),
  createTask: (task) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),
  updateTask: (taskId, changes) => request(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  }),
  deleteTask: (taskId) => request(`/tasks/${taskId}`, {
    method: 'DELETE',
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
