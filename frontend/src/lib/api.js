const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const fetcher = async (url, options = {}) => {
  const token = localStorage.getItem('registry_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('registry_token');
    localStorage.removeItem('registry_user');
    window.location.href = '/login';
    return;
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const message = error.error || 'API Request failed';
    window.dispatchEvent(new CustomEvent('api-error', { detail: message }));
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
};

export const authApi = {
  login: (email, password) => fetcher('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (email, password) => fetcher('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
};

export const sessionApi = {
  create: (data) => fetcher('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  list: () => fetcher('/sessions'),
  byDate: (date) => fetcher(`/sessions?date=${date}`),
  stats: () => fetcher(`/sessions/stats?tz=${-new Date().getTimezoneOffset() / 60}`),
  heatmap: () => fetcher(`/sessions/heatmap?tz=${-new Date().getTimezoneOffset() / 60}`),
  delete: (id) => fetcher(`/sessions/${id}`, { method: 'DELETE' }),
  exportCsv: async () => {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const token = localStorage.getItem('registry_token');
    const tz = -new Date().getTimezoneOffset(); // minutes ahead of UTC
    const res = await fetch(`${base}/sessions/export?tz=${tz}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pomogit-sessions.csv'; a.click();
    URL.revokeObjectURL(url);
  },
};

export const groupApi = {
  list: (status) => fetcher(`/groups${status ? `?status=${status}` : ''}`),
  get: (id) => fetcher(`/groups/${id}`),
  create: (name, repoFullName) => fetcher('/groups', { method: 'POST', body: JSON.stringify({ name, repoFullName }) }),
  setStatus: (id, status) => fetcher(`/groups/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id) => fetcher(`/groups/${id}`, { method: 'DELETE' }),
  leave: (id) => fetcher(`/groups/${id}/leave`, { method: 'DELETE' }),
  commits: (id) => fetcher(`/groups/${id}/commits`),
  telemetry: (id) => fetcher(`/groups/${id}/telemetry`),
  notes: (id) => fetcher(`/groups/${id}/notes`),
  addNote: (id, content) => fetcher(`/groups/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
};

export const usersApi = {
  list: () => fetcher('/users'),
  me: () => fetcher('/users/me'),
  updateMe: (data) => fetcher('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
};

export const githubApi = {
  getRepos: () => fetcher('/github/repos'),
  getCommits: (owner, repo) => fetcher(`/github/repos/${owner}/${repo}/commits`),
  heatmap: () => fetcher('/github/heatmap'),
  searchCommits: (date) => fetcher(`/github/commits/search?date=${date}`),
};

export const settingsApi = {
  get: () => fetcher('/settings'),
  update: (data) => fetcher('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
  disconnectGithub: () => fetcher('/settings/github', { method: 'DELETE' }),
};

export const adminApi = {
  stats: () => fetcher('/admin/stats'),
  users: () => fetcher('/admin/users'),
  ban: (id) => fetcher(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  setRole: (id, role) => fetcher(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  delete: (id) => fetcher(`/admin/users/${id}`, { method: 'DELETE' }),
};
