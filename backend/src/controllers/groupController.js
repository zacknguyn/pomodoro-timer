import { Router } from 'express';
import groupRepository from '../repositories/groupRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Create group
router.post('/', (req, res) => {
  const { name, repoFullName } = req.body;
  if (!name || !repoFullName) return res.status(400).json({ error: 'name and repoFullName required' });

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

// Leave group
router.delete('/:id/leave', (req, res) => {
  const group = groupRepository.findById(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.owner_id === req.user.userId) return res.status(400).json({ error: 'Owner cannot leave — delete the group instead' });

  groupRepository.removeMember(req.params.id, req.user.userId);
  res.json({ success: true });
});

export default router;
