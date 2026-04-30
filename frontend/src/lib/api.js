const API_BASE = 'http://localhost:3000/api';

const fetcher = async (url, options = {}) => {
  const token = localStorage.getItem('registry_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
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
  create: (data) => fetcher('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  list: () => fetcher('/sessions'),
  stats: () => fetcher('/sessions/stats'),
};

export const githubApi = {
  getRepos: (githubToken) => fetcher('/github/repos', {
    headers: { 'x-github-token': githubToken },
  }),
  getCommits: (githubToken, owner, repo) => fetcher(`/github/repos/${owner}/${repo}/commits`, {
    headers: { 'x-github-token': githubToken },
  }),
};
