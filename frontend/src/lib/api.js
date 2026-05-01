const API_BASE = 'http://localhost:3000/api';

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
    const error = await response.json();
    throw new Error(error.error || 'API Request failed');
  }
  return response.json();
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
  stats: () => fetcher('/sessions/stats'),
  heatmap: () => fetcher('/sessions/heatmap'),
};

export const githubApi = {
  getRepos: () => fetcher('/github/repos'),
  getCommits: (owner, repo) => fetcher(`/github/repos/${owner}/${repo}/commits`),
  heatmap: () => fetcher('/github/heatmap'),
  searchCommits: (date) => fetcher(`/github/commits/search?date=${date}`),
};

export const settingsApi = {
  get: () => fetcher('/settings'),
  update: (data) => fetcher('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};
