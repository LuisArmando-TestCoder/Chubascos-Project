import { Suspense } from 'react';
import { getLiveFeed, getEvents, getUsers, getTagsByIds } from '@/actions/data';
import { HeroSection } from '@/components/templates/HomeTemplate/HeroSection';
import { EventsSection } from '@/components/templates/HomeTemplate/EventsSection';
import { LiveFeedSection } from '@/components/templates/HomeTemplate/LiveFeedSection';
import { UsersSection } from '@/components/templates/HomeTemplate/UsersSection';
import { RecordSection } from '@/components/templates/HomeTemplate/RecordSection';
import { Footer } from '@/components/organisms/Footer/Footer';
import type { Metadata } from 'next';
import type { Tag } from '@/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chubascos | Lluvias repentinas dejando charcos',
  description: 'Plataforma para poetas, artistas y alquimistas digitales. Lluvias repentinas dejando charcos.',
  openGraph: {
    title: 'CHUBASCOS',
    description: 'Lluvias repentinas dejando charcos',
    type: 'website',
  },
};

export default async function HomePage() {
  const [feedResult, eventsResult, usersResult] = await Promise.all([
    getLiveFeed(20), // 20 feed the pluviograma; the ledger shows the newest 10
    getEvents(6),
    getUsers(6),
  ]);

  // Collect all unique tag IDs from feed posts and events, resolve in one batch
  const allTagIds = [
    ...new Set([
      ...(feedResult.items as any[]).slice(0, 10).flatMap((p: any) => p.tagIds || []),
      ...(eventsResult.items as any[]).flatMap((e: any) => e.tagIds || []),
    ]),
  ];
  const allTags = await getTagsByIds(allTagIds);
  const tagMap: Record<string, Tag> = Object.fromEntries(allTags.map((t) => [t.id, t]));

  return (
    <main>
      <HeroSection />
      <RecordSection posts={feedResult.items as any} />
      <Suspense fallback={null}>
        <EventsSection events={eventsResult.items as any} tagMap={tagMap} />
      </Suspense>
      <Suspense fallback={null}>
        <LiveFeedSection posts={(feedResult.items as any[]).slice(0, 10)} tagMap={tagMap} />
      </Suspense>
      <Suspense fallback={null}>
        <UsersSection users={usersResult.items as any} />
      </Suspense>
      <Footer />
    </main>
  );
}
