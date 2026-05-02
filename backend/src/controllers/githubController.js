import { Router } from 'express';
import githubService from '../services/githubService.js';
import settingsRepository from '../repositories/settingsRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) return res.redirect(`${FRONTEND_URL}/github/callback?error=missing_params`);

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(`${FRONTEND_URL}/github/callback?error=token_exchange_failed`);
    }

    await settingsRepository.setGithubToken(userId, tokenData.access_token);

    try {
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const ghUser = await userRes.json();
      if (ghUser.login) await settingsRepository.setGithubUsername(userId, ghUser.login);
    } catch (_) {}

    try {
      const repos = await githubService.getUserRepos(tokenData.access_token);
      const repoNames = repos.map(r => r.full_name);
      const matchingGroups = await groupRepository.findActiveGroupsForRepos(repoNames);
      await Promise.all(matchingGroups.map(g => groupRepository.addMember(g.id, userId, 'member')));
    } catch (_) {}

    res.redirect(`${FRONTEND_URL}/github/callback?success=true`);
  } catch (e) {
    res.redirect(`${FRONTEND_URL}/github/callback?error=server_error`);
  }
});

router.use(authMiddleware);

router.get('/repos', async (req, res) => {
  const token = await settingsRepository.getGithubToken(req.user.userId);
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  try {
    res.json(await githubService.getUserRepos(token));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/heatmap', async (req, res) => {
  const token = await settingsRepository.getGithubToken(req.user.userId);
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  try {
    res.json(await githubService.getCommitHeatmap(token));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/commits/search', async (req, res) => {
  const token = await settingsRepository.getGithubToken(req.user.userId);
  const { date } = req.query;
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    res.json(await githubService.searchCommitsByDate(token, date));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/repos/:owner/:repo/commits', async (req, res) => {
  const token = await settingsRepository.getGithubToken(req.user.userId);
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  try {
    res.json(await githubService.getCommits(token, req.params.owner, req.params.repo));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
