import { Router } from 'express';
import githubService from '../services/githubService.js';
import settingsRepository from '../repositories/settingsRepository.js';
import groupRepository from '../repositories/groupRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Public — GitHub redirects here with ?code=&state=<jwt>
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.redirect(`${FRONTEND_URL}/github/callback?error=missing_params`);

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

    const payload = JSON.parse(Buffer.from(state.split('.')[1], 'base64').toString());
    settingsRepository.setGithubToken(payload.userId, tokenData.access_token);

    // Auto-join: add user to any existing group whose repo they have access to
    try {
      const repos = await githubService.getUserRepos(tokenData.access_token);
      const repoNames = repos.map(r => r.full_name);
      const matchingGroups = groupRepository.findActiveGroupsForRepos(repoNames);
      for (const group of matchingGroups) {
        groupRepository.addMember(group.id, payload.userId, 'member');
      }
    } catch (_) { /* non-fatal */ }

    res.redirect(`${FRONTEND_URL}/github/callback?success=true`);
  } catch (err) {
    res.redirect(`${FRONTEND_URL}/github/callback?error=server_error`);
  }
});

// Protected
router.use(authMiddleware);

router.get('/heatmap', async (req, res) => {
  const token = settingsRepository.getGithubToken(req.user.userId);
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  try {
    res.json(await githubService.getCommitHeatmap(token));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/commits/search', async (req, res) => {
  const token = settingsRepository.getGithubToken(req.user.userId);
  const { date } = req.query;
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  if (!date) return res.status(400).json({ error: 'date required' });
  try {
    res.json(await githubService.searchCommitsByDate(token, date));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/repos', async (req, res) => {
  const token = settingsRepository.getGithubToken(req.user.userId);
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  try {
    res.json(await githubService.getUserRepos(token));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/repos/:owner/:repo/commits', async (req, res) => {
  const token = settingsRepository.getGithubToken(req.user.userId);
  const { owner, repo } = req.params;
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });
  try {
    res.json(await githubService.getCommits(token, owner, repo));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
