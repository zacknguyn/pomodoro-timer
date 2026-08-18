const API_BASE = import.meta.env.VITE_API_URL || '/api'

export class AuthApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new AuthApiError('Pomogit could not reach the account service.')
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new AuthApiError(payload?.error || 'The request could not be completed.', response.status)
  }
  return response.status === 204 ? null : response.json()
}

export const authApi = {
  me: () => request('/auth/me'),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (credentials) => request('/auth/register', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
}

export const adminApi = {
  overview: () => request('/admin/overview'),
  users: () => request('/admin/users'),
  toggleBan: (id) => request(`/admin/users/${id}/ban`, { method: 'PATCH', body: '{}' }),
  setRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
}
