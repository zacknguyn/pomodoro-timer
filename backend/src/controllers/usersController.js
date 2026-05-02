import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import sessionRepository from '../repositories/sessionRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Public profile — no auth required
router.get('/:username/profile', (req, res) => {
  const user = userRepository.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stats = sessionRepository.getStats(user.id, 0);
  const heatmap = sessionRepository.getHeatmap(user.id, 0);
  const settings = settingsRepository.findRawByUserId(user.id);

  res.json({
    username: req.params.username,
    displayName: user.display_name || null,
    bio: user.bio || null,
    avatarStyle: user.avatar_style || 'thumbs',
    githubUsername: settings?.github_username || null,
    stats,
    heatmap,
  });
});

router.use(authMiddleware);

router.get('/me', (req, res) => {
  const user = userRepository.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: user.id,
    email: user.email,
    displayName: user.display_name || null,
    bio: user.bio || null,
    avatarStyle: user.avatar_style || 'thumbs',
  });
});

router.patch('/me', (req, res) => {
  const { displayName, bio, avatarStyle } = req.body;
  const VALID_STYLES = ['thumbs', 'avataaars', 'bottts', 'lorelei', 'micah'];
  if (avatarStyle && !VALID_STYLES.includes(avatarStyle)) {
    return res.status(400).json({ error: 'Invalid avatar style' });
  }
  userRepository.updateProfile(req.user.userId, { displayName, bio, avatarStyle });
  res.json({ success: true });
});

router.get('/', (req, res) => {
  const users = userRepository.findAll();
  // Attach today's session count per user for "active" status
  const today = new Date().toISOString().slice(0, 10);
  const result = users.map(u => {
    const todaySessions = sessionRepository.findByDate(u.id, today);
    return {
      id: u.id,
      email: u.email,
      name: u.email.split('@')[0],
      sessionsToday: todaySessions.length,
      isActive: todaySessions.some(s => {
        const mins = (Date.now() - new Date(s.completed_at)) / 60000;
        return mins < 30; // active if completed a session in last 30 min
      }),
    };
  });
  res.json(result);
});

export default router;
