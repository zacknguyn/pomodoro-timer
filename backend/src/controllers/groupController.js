import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import groupRepository from '../repositories/groupRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import githubService from '../services/githubService.js';
import pool from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { name, repoFullName } = req.body;
  if (!name || !repoFullName) return res.status(400).json({ error: 'name and repoFullName required' });

  const settings = await settingsRepository.findRawByUserId(req.user.userId);
  if (!settings?.github_token) return res.status(403).json({ error: 'Connect GitHub before creating a group' });

  const existing = await groupRepository.findByRepo(repoFullName);
  if (existing) return res.status(409).json({ error: 'A group already exists for this repo', groupId: existing.id });

  try {
    const group = await groupRepository.create(req.user.userId, name, repoFullName);
    res.status(201).json(group);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  const groups = await groupRepository.findByUser(req.user.userId, req.query.status || null);
  const result = await Promise.all(groups.map(async g => ({
    ...g,
    memberCount: (await groupRepository.getMembers(g.id)).length,
  })));
  res.json(result);
});

router.get('/:id', async (req, res) => {
  const group = await groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const member = await groupRepository.getMember(req.params.id, req.user.userId);
  if (!member) return res.status(403).json({ error: 'Not a member' });
  res.json({ ...group, members: await groupRepository.getMembers(req.params.id) });
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'archived'].includes(status)) return res.status(400).json({ error: 'status must be active or archived' });
  const group = await groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.user.userId) return res.status(403).json({ error: 'Owner only' });
  await groupRepository.setStatus(req.params.id, status);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const group = await groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.user.userId) return res.status(403).json({ error: 'Owner only' });
  await groupRepository.delete(req.params.id);
  res.json({ success: true });
});

router.get('/:id/notes', async (req, res) => {
  if (!await groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });
  const { rows } = await pool.query(
    `SELECT n.id, n.content, n.created_at, u.email
     FROM group_notes n JOIN users u ON u.id = n.user_id
     WHERE n.group_id = $1 ORDER BY n.created_at DESC LIMIT 50`,
    [req.params.id]
  );
  res.json(rows.map(n => ({ ...n, author: n.email.split('@')[0] })));
});

router.post('/:id/notes', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  if (!await groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });
  await pool.query(
    'INSERT INTO group_notes (id, group_id, user_id, content) VALUES ($1, $2, $3, $4)',
    [randomUUID(), req.params.id, req.user.userId, content.trim()]
  );
  res.status(201).json({ success: true });
});

router.get('/:id/telemetry', async (req, res) => {
  const group = await groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!await groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });

  const members = await groupRepository.getMembers(req.params.id);
  if (!members.length) return res.json({ focusDensity: 0, meanSession: 0, totalSessions: 0 });

  const placeholders = members.map((_, i) => `$${i + 1}`).join(',');
  const { rows: [stats] } = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(AVG(duration), 0) AS avg_duration
     FROM sessions
     WHERE user_id IN (${placeholders}) AND mode = 'pomodoro'
       AND completed_at >= NOW() - INTERVAL '7 days'`,
    members.map(m => m.id)
  );

  res.json({
    focusDensity: Math.round((parseInt(stats.total) / (members.length * 7)) * 10) / 10,
    meanSession: Math.round(parseFloat(stats.avg_duration)),
    totalSessions: parseInt(stats.total),
  });
});

router.get('/:id/commits', async (req, res) => {
  const group = await groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!await groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });

  const token = await settingsRepository.getGithubToken(req.user.userId);
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });

  try {
    const members = await groupRepository.getMembers(req.params.id);
    const memberUsernames = new Set(members.map(m => m.github_username).filter(Boolean));
    const [owner, repo] = group.repo_full_name.split('/');
    const commits = await githubService.getCommits(token, owner, repo);
    const filtered = memberUsernames.size > 0 ? commits.filter(c => memberUsernames.has(c.authorLogin)) : commits;
    res.json(filtered.length > 0 ? filtered : commits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id/leave', async (req, res) => {
  const group = await groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id === req.user.userId) return res.status(400).json({ error: 'Owner cannot leave — delete the group instead' });
  await groupRepository.removeMember(req.params.id, req.user.userId);
  res.json({ success: true });
});

export default router;
