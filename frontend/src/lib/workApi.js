import { LOCAL_PREVIEW } from './runtime.js'
import { requestJson } from './http.js'

export class WorkApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'WorkApiError'
    this.status = status
  }
}

function request(path, options) {
  return requestJson(path, options, (kind, status = 0, message) => {
    if (status === 401) window.dispatchEvent(new CustomEvent('pomogit:auth-expired'))
    return new WorkApiError(message || {
      timeout: 'The workspace took too long to respond. Try again.',
      network: 'The workspace could not connect to the local API.',
      response: 'The workspace could not be updated.',
    }[kind], status)
  })
}

const api = {
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
  listSessions: () => request('/sessions'),
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

export const githubApi = {
  removeProject: (name) => request('/tasks/projects', { method: 'DELETE', body: JSON.stringify({ name }) }),
  projects: () => request('/github/projects'),
  repositories: (page = 1) => request(`/github/repositories?page=${page}`),
  connect: (repository) => request('/github/projects', { method: 'POST', body: JSON.stringify({ repository }) }),
  issues: (id, page = 1) => request(`/github/projects/${id}/issues?page=${page}`),
  importIssues: (id, numbers) => request(`/github/projects/${id}/import`, { method: 'POST', body: JSON.stringify({ numbers }) }),
}

// Load sample data only when the development preview was explicitly requested.
export const workApi = LOCAL_PREVIEW
  ? Object.fromEntries(Object.keys(api).map((name) => [name, async (...args) => (await import('./mockWorkspace')).mockWorkspace[name](...args)]))
  : api
