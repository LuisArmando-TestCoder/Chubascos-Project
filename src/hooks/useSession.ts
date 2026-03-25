'use client';
import { useEffect, useState } from 'react';

interface ClientSession {
  userId?: string;
  email?: string;
  isLoggedIn: boolean;
}

export function useSession(): { session: ClientSession; loading: boolean } {
  const [session, setSession] = useState<ClientSession>({ isLoggedIn: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/guard/check')
      .then((r) => r.json())
      .then((data) => {
        setSession(data.session || { isLoggedIn: false });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { session, loading };
}
