'use client';
import { useEffect } from 'react';
import { useProfileStore } from '@/store/profile';

export function useSession() {
  const { isLoggedIn, userId, email, username, loaded, setProfile } = useProfileStore();

  useEffect(() => {
    if (loaded) return; // already fetched
    fetch('/api/me')
      .then((r) => r.json())
      .then((data) => {
        setProfile({
          isLoggedIn: data.isLoggedIn ?? false,
          userId:     data.userId    ?? '',
          email:      data.email     ?? '',
          username:   data.username  ?? '',
          loaded:     true,
        });
      })
      .catch(() => setProfile({ isLoggedIn: false, loaded: true }));
  }, [loaded, setProfile]);

  return {
    session: { isLoggedIn, userId, email },
    username,
    loading: !loaded,
  };
}
