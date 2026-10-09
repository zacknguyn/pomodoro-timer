import { Router } from 'express';
import { z } from 'zod';
import pool from '../lib/db.js';
import { ApiError, asyncRoute } from '../lib/workspaceApi.js';
const router = Router();
const pageSchema = z.coerce.number().int().min(1).max(100).default(1);
const repositorySchema = z.string().trim().max(2048).transform(value => {
  if (/^(https?:\/\/)?github\.com\//i.test(value)) {
    try {
      const url = new URL(value.startsWith('http') ? value : `https://${value}`);
      if (url.hostname !== 'github.com' || url.username || url.password || url.search || url.hash) return '';
      return url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
    } catch { return ''; }
  }
  return value.replace(/\.git$/, '');
}).pipe(z.string().regex(/^[a-z\d-]{1,39}\/[a-z\d_.-]{1,100}$/i, 'Use a GitHub repository URL or owner/repository.'));
export async function githubRead(path) {
  let response;
  try { response = await fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Pomogit', 'X-GitHub-Api-Version': '2026-03-10' }, signal: AbortSignal.timeout(8000) }); }
  catch { throw new ApiError(502, 'GitHub could not be reached. Try again.', 'github_unavailable'); }
  if (response.status === 404) throw new ApiError(404, 'Public repository or issue not found. Private repositories are not supported yet.', 'github_not_found');
  if (response.status === 403 || response.status === 429) throw new ApiError(429, 'GitHub’s public API limit was reached. Try again later.', 'github_rate_limited');
  if (!response.ok) throw new ApiError(502, 'GitHub could not load this data. Try again.', 'github_unavailable');
  return response.json();
}
function repoData(repo) {
  if (repo.private || !Number.isSafeInteger(repo.id) || !/^[a-z\d-]{1,39}\/[a-z\d_.-]{1,100}$/i.test(repo.full_name)) throw new ApiError(400, 'Choose a public GitHub repository.', 'github_invalid_repository');
  return { githubId: String(repo.id), fullName: repo.full_name, description: repo.description || '', url: `https://github.com/${repo.full_name}` };
}
async function connected(userId, id) {
  const { rows: [project] } = await pool.query('SELECT * FROM github_projects WHERE user_id=$1 AND id=$2', [userId, id]);
  if (!project) throw new ApiError(404, 'Connected repository not found.', 'project_not_found');
  return project;
}
router.get('/projects', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id, full_name AS "fullName" FROM github_projects WHERE user_id=$1 ORDER BY full_name', [req.user.id]);
  res.json(rows);
}));
router.get('/repositories', asyncRoute(async (req, res) => {
  const page = pageSchema.parse(req.query.page);
  const { rows: [user] } = await pool.query('SELECT github_id FROM users WHERE id=$1', [req.user.id]);
  if (!user?.github_id) return res.json({ repositories: [], hasMore: false, needsGithub: true });
  const identity = await githubRead(`/user/${encodeURIComponent(user.github_id)}`);
  if (!/^[a-z\d-]{1,39}$/i.test(identity.login)) throw new ApiError(502, 'GitHub returned an invalid identity.');
  const repositories = await githubRead(`/users/${encodeURIComponent(identity.login)}/repos?sort=updated&per_page=30&page=${page}`);
  res.json({ repositories: repositories.map(repoData), hasMore: repositories.length === 30, needsGithub: false });
}));
router.post('/projects', asyncRoute(async (req, res) => {
  const { repository } = z.object({ repository: repositorySchema }).strict().parse(req.body);
  const repo = repoData(await githubRead(`/repos/${repository}`));
  const { rows: [project] } = await pool.query('INSERT INTO github_projects(user_id,github_id,full_name) VALUES($1,$2,$3) ON CONFLICT(user_id,github_id) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id, full_name AS "fullName"', [req.user.id, repo.githubId, repo.fullName]);
  res.json(project);
}));
router.get('/projects/:id/issues', asyncRoute(async (req, res) => {
  const project = await connected(req.user.id, req.params.id);
  const page = pageSchema.parse(req.query.page);
  const issues = await githubRead(`/repos/${project.full_name}/issues?state=open&per_page=30&page=${page}`);
  const { rows } = await pool.query('SELECT github_issue_id FROM tasks WHERE user_id=$1 AND github_issue_id IS NOT NULL', [req.user.id]);
  const imported = new Set(rows.map(row => row.github_issue_id));
  res.json({ issues: issues.filter(issue => !issue.pull_request).map(issue => ({ number: issue.number, title: issue.title, imported: imported.has(String(issue.id)) })), hasMore: issues.length === 30 });
}));
router.post('/projects/:id/import', asyncRoute(async (req, res) => {
  const { numbers } = z.object({ numbers: z.array(z.number().int().positive()).min(1).max(20).refine(values => new Set(values).size === values.length) }).strict().parse(req.body);
  const project = await connected(req.user.id, req.params.id);
  // Fetch before the transaction; never hold the database connection during network calls.
  const issues = await Promise.all(numbers.map(async number => {
    const issue = await githubRead(`/repos/${project.full_name}/issues/${number}`);
    if (issue.pull_request || !Number.isSafeInteger(issue.id) || typeof issue.title !== 'string' || !issue.title.trim()) throw new ApiError(400, 'Only GitHub issues can be imported.');
    return issue;
  }));
  const client = await pool.connect();
  let imported = 0;
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
    const stillConnected = await client.query('SELECT id FROM github_projects WHERE user_id=$1 AND id=$2', [req.user.id, project.id]);
    if (!stillConnected.rowCount) throw new ApiError(404, 'This project was removed. Reconnect it before importing.', 'project_not_found');
    for (const issue of issues) {
      const result = await client.query("INSERT INTO tasks(user_id,title,status,project,reference_url,github_issue_id) VALUES($1,$2,'inbox',$3,$4,$5) ON CONFLICT(user_id,github_issue_id) DO NOTHING", [req.user.id, issue.title.slice(0,240), project.full_name, `https://github.com/${project.full_name}/issues/${issue.number}`, String(issue.id)]);
      imported += result.rowCount;
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  res.json({ imported, skipped: numbers.length - imported });
}));
export default router;
