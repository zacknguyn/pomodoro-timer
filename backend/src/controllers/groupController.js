import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import groupRepository from '../repositories/groupRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import githubService from '../services/githubService.js';
import db from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Create group
router.post('/', (req, res) => {
  const { name, repoFullName } = req.body;
  if (!name || !repoFullName) return res.status(400).json({ error: 'name and repoFullName required' });

  const settings = settingsRepository.findByUserId(req.user.userId);
  if (!settings?.github_token) return res.status(403).json({ error: 'Connect GitHub before creating a group' });

  const existing = groupRepository.findByRepo(repoFullName);
  if (existing) return res.status(409).json({ error: 'A group already exists for this repo', groupId: existing.id });

  try {
    const group = groupRepository.create(req.user.userId, name, repoFullName);
    res.status(201).json(group);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List user's groups
router.get('/', (req, res) => {
  const { status } = req.query; // 'active' | 'archived' | undefined (all)
  const groups = groupRepository.findByUser(req.user.userId, status || null);
  res.json(groups.map(g => ({
    ...g,
    memberCount: groupRepository.getMembers(g.id).length,
  })));
});

// Get group detail + members
router.get('/:id', (req, res) => {
  const group = groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const member = groupRepository.getMember(req.params.id, req.user.userId);
  if (!member) return res.status(403).json({ error: 'Not a member' });

  res.json({ ...group, members: groupRepository.getMembers(req.params.id) });
});

// Archive or reactivate
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'archived'].includes(status)) return res.status(400).json({ error: 'status must be active or archived' });

  const group = groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.user.userId) return res.status(403).json({ error: 'Owner only' });

  groupRepository.setStatus(req.params.id, status);
  res.json({ success: true });
});

// Delete group (owner only)
router.delete('/:id', (req, res) => {
  const group = groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id !== req.user.userId) return res.status(403).json({ error: 'Owner only' });

  groupRepository.delete(req.params.id);
  res.json({ success: true });
});

// Notes
router.get('/:id/notes', (req, res) => {
  if (!groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });
  const notes = db.prepare(`
    SELECT n.id, n.content, n.created_at, u.email
    FROM group_notes n JOIN users u ON u.id = n.user_id
    WHERE n.group_id = ? ORDER BY n.created_at DESC LIMIT 50
  `).all(req.params.id).map(n => ({ ...n, author: n.email.split('@')[0] }));
  res.json(notes);
});

router.post('/:id/notes', (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content required' });
  if (!groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });
  db.prepare('INSERT INTO group_notes (id, group_id, user_id, content) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), req.params.id, req.user.userId, content.trim());
  res.status(201).json({ success: true });
});

// Group telemetry - focus density and mean session for all members
router.get('/:id/telemetry', (req, res) => {
  const group = groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });

  const members = groupRepository.getMembers(req.params.id);
  const memberIds = members.map(m => m.id);
  if (!memberIds.length) return res.json({ focusDensity: 0, meanSession: 0, totalSessions: 0 });

  const placeholders = memberIds.map(() => '?').join(',');
  const stats = db.prepare(`
    SELECT COUNT(*) as total, COALESCE(AVG(duration), 0) as avg_duration
    FROM sessions
    WHERE user_id IN (${placeholders}) AND mode = 'pomodoro'
      AND completed_at >= date('now', '-7 days')
  `).get(...memberIds);

  const focusDensity = Math.round((stats.total / (memberIds.length * 7)) * 10) / 10;

  res.json({
    focusDensity,
    meanSession: Math.round(stats.avg_duration),
    totalSessions: stats.total,
  });
});

// Get commits filtered to group members
router.get('/:id/commits', async (req, res) => {
  const group = groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!groupRepository.getMember(req.params.id, req.user.userId)) return res.status(403).json({ error: 'Not a member' });

  const token = settingsRepository.getGithubToken(req.user.userId);
  if (!token) return res.status(400).json({ error: 'GitHub not connected' });

  try {
    const members = groupRepository.getMembers(req.params.id);
    const memberUsernames = new Set(members.map(m => m.github_username).filter(Boolean));
    const [owner, repo] = group.repo_full_name.split('/');
    const commits = await githubService.getCommits(token, owner, repo);
    // Filter to commits authored by group members (if we have their usernames)
    const filtered = memberUsernames.size > 0
      ? commits.filter(c => memberUsernames.has(c.authorLogin))
      : commits;
    // Fall back to all commits if filtering yields nothing (members haven't linked GitHub yet)
    res.json(filtered.length > 0 ? filtered : commits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Leave group
router.delete('/:id/leave', (req, res) => {
  const group = groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id === req.user.userId) return res.status(400).json({ error: 'Owner cannot leave — delete the group instead' });

  groupRepository.removeMember(req.params.id, req.user.userId);
  res.json({ success: true });
});

export default router;
