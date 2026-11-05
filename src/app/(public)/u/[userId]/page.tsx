import type { Metadata } from 'next';
import { getUserPosts, getUserEvents, getUserBooks, getTagsByIds, getKindredVoices } from '@/actions/data';
import { publicName } from '@/lib/handles';
import { findOwner, loadOwner } from './owner';
import { UserProfileTemplate } from '@/components/templates/UserProfileTemplate/UserProfileTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';
import type { Tag } from '@/types';

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId: segment } = await params;
  const user = await findOwner(segment);
  if (!user) return { title: 'Usuario no encontrado' };
  const name = publicName(user);
  return {
    title: `${name}`,
    description: user.bio || `Perfil de ${name} en Chubascos.`,
    openGraph: { title: name, description: user.bio || '' },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { userId: segment } = await params;
  const user = await loadOwner(segment);

  const [postsResult, events, books, kindred] = await Promise.all([
    getUserPosts(user.id, 10),
    getUserEvents(user.id),
    getUserBooks(user.id),
    getKindredVoices(user.id),
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
        initialBooks={books}
        initialTagMap={tagMap}
        kindred={kindred}
      />
      <Footer />
    </>
  );
}
