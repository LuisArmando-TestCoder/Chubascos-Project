'use client';
import { useEffect } from 'react';
import { useProfileStore } from '@/store/profile';
import { useSavedStore } from '@/store/saved';

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
        
        // If we just logged in for the first time in this store instance, 
        // clear old anonymous saved items to prevent mixing sessions
        if (data.isLoggedIn && !isLoggedIn) {
          useSavedStore.getState().clearAll();
        }
      })
      .catch(() => setProfile({ isLoggedIn: false, loaded: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, setProfile]);

  return {
    session: { isLoggedIn, userId, email },
    username,
    loading: !loaded,
  };
}
