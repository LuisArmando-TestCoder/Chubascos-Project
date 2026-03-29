import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProfileState {
  isLoggedIn: boolean;
  userId: string;
  email: string;
  username: string;
  /** Not persisted — always re-validated against /api/me on mount */
  loaded: boolean;
  setProfile: (data: Partial<Omit<ProfileState, 'setProfile'>>) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userId: '',
      email: '',
      username: '',
      loaded: false,
      setProfile: (data) => set((s) => ({ ...s, ...data })),
    }),
    {
      name: 'chubascos_profile',
      // Never persist `loaded` — we always re-fetch from /api/me on mount
      // so the session is validated with Firestore, but the cached name/email
      // is shown immediately while the request is in flight.
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        userId:     state.userId,
        email:      state.email,
        username:   state.username,
      }),
    }
  )
);
