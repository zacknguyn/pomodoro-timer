import { Router } from 'express';
import githubService from '../services/githubService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Note: In real app, accessToken should come from DB after OAuth flow
// For now, client sends it in header for prototype testing
router.get('/repos', async (req, res) => {
  const token = req.headers['x-github-token'];
  if (!token) return res.status(400).json({ error: 'Missing x-github-token header' });

  try {
    const repos = await githubService.getUserRepos(token);
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/repos/:owner/:repo/commits', async (req, res) => {
  const token = req.headers['x-github-token'];
  const { owner, repo } = req.params;
  if (!token) return res.status(400).json({ error: 'Missing x-github-token header' });

  try {
    const commits = await githubService.getCommits(token, owner, repo);
    res.json(commits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
