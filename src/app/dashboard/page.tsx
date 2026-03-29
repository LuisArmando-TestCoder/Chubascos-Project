import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/actions/auth';
import { getUserProfile, getPost, getEvent, getPreviousPost, getNextPost, getUserEvents } from '@/actions/data';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate/DashboardTemplate';
import type { Post, Event } from '@/types';

export const metadata: Metadata = {
  title: 'Panel | Chubascos',
};

interface Props {
  searchParams: Promise<{ edit?: string; id?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) redirect('/entrar');
  const user = await getUserProfile(session.userId);
  if (!user) redirect('/entrar');

  const { edit, id } = await searchParams;

  let editPost: Post | null = null;
  let editEvent: Event | null = null;
  let editPrevPost: Post | null = null;
  let editNextPost: Post | null = null;
  let editPrevEvent: Event | null = null;
  let editNextEvent: Event | null = null;

  if (edit === 'post' && id) {
    const post = await getPost(session.userId, id);
    if (post && post.userId === session.userId) {
      editPost = post;
      // Fetch adjacent posts for navigation (newest=anterior, older=siguiente)
      const [prev, next] = await Promise.all([
        getPreviousPost(session.userId, post.updatedAt),
        getNextPost(session.userId, post.updatedAt),
      ]);
      editPrevPost = prev; // older post → "Siguiente"
      editNextPost = next; // newer post → "Anterior"
    }
  } else if (edit === 'event' && id) {
    const event = await getEvent(id);
    if (event && event.ownerUserId === session.userId) {
      editEvent = event;
      // Fetch all user events and find adjacent ones
      const events = await getUserEvents(session.userId);
      const idx = events.findIndex((e) => e.id === id);
      editPrevEvent = idx > 0 ? events[idx - 1] : null;
      editNextEvent = idx >= 0 && idx < events.length - 1 ? events[idx + 1] : null;
    }
  }

  return (
    <DashboardTemplate
      key={editPost?.id || editEvent?.id || 'dashboard'}
      user={user}
      editPost={editPost}
      editEvent={editEvent}
      editPrevPost={editPrevPost}
      editNextPost={editNextPost}
      editPrevEvent={editPrevEvent}
      editNextEvent={editNextEvent}
    />
  );
}
