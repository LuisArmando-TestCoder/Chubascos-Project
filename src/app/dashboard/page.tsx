import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/actions/auth';
import { getUserProfile, getPost, getEvent } from '@/actions/data';
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

  if (edit === 'post' && id) {
    const post = await getPost(session.userId, id);
    if (post && post.userId === session.userId) editPost = post;
  } else if (edit === 'event' && id) {
    const event = await getEvent(id);
    if (event && event.ownerUserId === session.userId) editEvent = event;
  }

  return <DashboardTemplate user={user} editPost={editPost} editEvent={editEvent} />;
}
