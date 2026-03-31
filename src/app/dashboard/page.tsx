import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/actions/auth';
import { getUserProfile, getPost, getEvent, getShader, getPreviousPost, getNextPost, getUserEvents, getUserAllPosts } from '@/actions/data';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate/DashboardTemplate';
import type { Post, Event, Shader } from '@/types';

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
  let editShader: Shader | null = null;
  let editEvent: Event | null = null;
  let editPrevPost: Post | null = null;
  let editNextPost: Post | null = null;
  let editPrevEvent: Event | null = null;
  let editNextEvent: Event | null = null;

  if (edit === 'post' && id) {
    const post = await getPost(session.userId, id);
    if (post && post.userId === session.userId) {
      editPost = post;
      // Fetch adjacent posts + shader in parallel
      const shaderId = (post as any).shaderId as string | undefined;
      const [prev, next, shader] = await Promise.all([
        getPreviousPost(session.userId, post.updatedAt),
        getNextPost(session.userId, post.updatedAt),
        shaderId ? getShader(shaderId) : Promise.resolve(null),
      ]);
      editPrevPost = prev; // older post → "Siguiente"
      editNextPost = next; // newer post → "Anterior"
      editShader = shader;
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

  // Fetch all user posts for the profile edit list (includes invisible ones)
  const allPosts = await getUserAllPosts(session.userId);

  return (
    <DashboardTemplate
      key={editPost?.id || editEvent?.id || 'dashboard'}
      user={user}
      userPosts={allPosts}
      editPost={editPost}
      editShader={editShader}
      editEvent={editEvent}
      editPrevPost={editPrevPost}
      editNextPost={editNextPost}
      editPrevEvent={editPrevEvent}
      editNextEvent={editNextEvent}
    />
  );
}
