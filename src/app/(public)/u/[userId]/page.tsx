import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getUserProfile, getUserPosts, getUserEvents, getUserProfileByEmail, getTagsByIds } from '@/actions/data';
import { UserProfileTemplate } from '@/components/templates/UserProfileTemplate/UserProfileTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';
import type { Tag } from '@/types';

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId: rawId } = await params;
  const userId = decodeURIComponent(rawId);
  const user = await getUserProfile(userId);
  if (!user) return { title: 'Usuario no encontrado | Chubascos' };
  const name = user.username || user.email.split('@')[0];
  return {
    title: `${name} | Chubascos`,
    description: user.bio || `Perfil de ${name} en Chubascos.`,
    openGraph: { title: name, description: user.bio || '' },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { userId: rawUserId } = await params;
  // Next.js may or may not decode %40 depending on version — decode explicitly
  const userId = decodeURIComponent(rawUserId);

  // Try direct doc-ID lookup first; fall back to email-field query
  let user = await getUserProfile(userId);
  if (!user) user = await getUserProfileByEmail(userId);
  if (!user) notFound();

  const [postsResult, events] = await Promise.all([
    getUserPosts(user.id, 10),
    getUserEvents(user.id),
  ]);

  // Collect all unique tag IDs from initial posts and events, then resolve them in one batch
  const allTagIds = [
    ...new Set([
      ...postsResult.items.flatMap((p) => p.tagIds || []),
      ...events.flatMap((e) => e.tagIds || []),
    ]),
  ];
  const allTags = await getTagsByIds(allTagIds);
  const tagMap: Record<string, Tag> = Object.fromEntries(allTags.map((t) => [t.id, t]));

  return (
    <>
      <UserProfileTemplate
        user={user}
        initialPosts={postsResult.items}
        nextCursor={postsResult.nextCursor}
        initialEvents={events}
        initialTagMap={tagMap}
      />
      <Footer />
    </>
  );
}
