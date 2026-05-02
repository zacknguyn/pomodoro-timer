import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import sessionRepository from '../repositories/sessionRepository.js';
import settingsRepository from '../repositories/settingsRepository.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:username/profile', async (req, res) => {
  const user = await userRepository.findByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const [stats, heatmap, settings] = await Promise.all([
    sessionRepository.getStats(user.id, 0),
    sessionRepository.getHeatmap(user.id, 0),
    settingsRepository.findRawByUserId(user.id),
  ]);

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

router.get('/me', async (req, res) => {
  const user = await userRepository.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user.id, email: user.email, displayName: user.display_name || null, bio: user.bio || null, avatarStyle: user.avatar_style || 'thumbs' });
});

router.patch('/me', async (req, res) => {
  const { displayName, bio, avatarStyle } = req.body;
  const VALID_STYLES = ['thumbs', 'avataaars', 'bottts', 'lorelei', 'micah'];
  if (avatarStyle && !VALID_STYLES.includes(avatarStyle)) {
    return res.status(400).json({ error: 'Invalid avatar style' });
  }
  await userRepository.updateProfile(req.user.userId, { displayName, bio, avatarStyle });
  res.json({ success: true });
});

router.get('/', async (req, res) => {
  const users = await userRepository.findAll();
  const today = new Date().toISOString().slice(0, 10);
  const result = await Promise.all(users.map(async u => {
    const todaySessions = await sessionRepository.findByDate(u.id, today);
    return {
      id: u.id,
      email: u.email,
      name: u.email.split('@')[0],
      sessionsToday: todaySessions.length,
      isActive: todaySessions.some(s => (Date.now() - new Date(s.completed_at)) / 60000 < 30),
    };
  }));
  res.json(result);
});

export default router;
