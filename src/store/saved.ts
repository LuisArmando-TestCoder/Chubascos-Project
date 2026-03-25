'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_POSTS = 100;
const MAX_USERS = 50;
const MAX_EVENTS = 50;

interface SavedState {
  posts: string[];
  users: string[];
  events: string[];
  savePost: (id: string) => void;
  unsavePost: (id: string) => void;
  saveUser: (id: string) => void;
  unsaveUser: (id: string) => void;
  saveEvent: (id: string) => void;
  unsaveEvent: (id: string) => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set) => ({
      posts: [],
      users: [],
      events: [],
      savePost: (id) =>
        set((state) => ({
          posts: state.posts.includes(id) ? state.posts : [...state.posts, id].slice(-MAX_POSTS),
        })),
      unsavePost: (id) =>
        set((state) => ({ posts: state.posts.filter((p) => p !== id) })),
      saveUser: (id) =>
        set((state) => ({
          users: state.users.includes(id) ? state.users : [...state.users, id].slice(-MAX_USERS),
        })),
      unsaveUser: (id) =>
        set((state) => ({ users: state.users.filter((u) => u !== id) })),
      saveEvent: (id) =>
        set((state) => ({
          events: state.events.includes(id) ? state.events : [...state.events, id].slice(-MAX_EVENTS),
        })),
      unsaveEvent: (id) =>
        set((state) => ({ events: state.events.filter((e) => e !== id) })),
    }),
    { name: 'chubascos_saved' }
  )
);
