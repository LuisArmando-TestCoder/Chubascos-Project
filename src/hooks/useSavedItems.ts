'use client';
import { useSavedStore } from '@/store/saved';

export function useSavedItems() {
  const { posts, users, events, savePost, unsavePost, saveUser, unsaveUser, saveEvent, unsaveEvent } = useSavedStore();

  return {
    savedPosts: posts,
    savedUsers: users,
    savedEvents: events,
    isPostSaved: (id: string) => posts.includes(id),
    isUserSaved: (id: string) => users.includes(id),
    isEventSaved: (id: string) => events.includes(id),
    savePost,
    unsavePost,
    saveUser,
    unsaveUser,
    saveEvent,
    unsaveEvent,
  };
}
