import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';

const CACHE_KEY = 'registry_profile';

export const avatarUrl = (seed, style = 'thumbs') =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

export const useProfile = () => {
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
  });

  useEffect(() => {
    usersApi.me().then(p => {
      setProfile(p);
      localStorage.setItem(CACHE_KEY, JSON.stringify(p));
    }).catch(() => {});
  }, []);

  const refresh = () => usersApi.me().then(p => {
    setProfile(p);
    localStorage.setItem(CACHE_KEY, JSON.stringify(p));
    return p;
  });

  const displayName = profile?.displayName || profile?.email?.split('@')[0] || 'Operator';
  const style = profile?.avatarStyle || 'thumbs';
  const seed = profile?.email || 'default';
  const avatar = avatarUrl(seed, style);

  return { profile, displayName, avatar, style, seed, refresh };
};
