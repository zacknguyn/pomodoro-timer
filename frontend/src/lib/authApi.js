import { requestJson } from './http.js'

export class AuthApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

function request(path, options) {
  return requestJson(path, options, (kind, status = 0, message) => new AuthApiError(message || {
    timeout: 'The account service took too long to respond. Try again.',
    network: 'Pomogit could not reach the account service.',
    response: 'The request could not be completed.',
  }[kind], status))
}

export const authApi = {
  me: () => request('/auth/me'),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (credentials) => request('/auth/register', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  github: () => request('/auth/github', { method: 'POST', body: '{}' }),
}

export const adminApi = {
  overview: () => request('/admin/overview'),
  users: () => request('/admin/users'),
  toggleBan: (id) => request(`/admin/users/${id}/ban`, { method: 'PATCH', body: '{}' }),
  setRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
}
