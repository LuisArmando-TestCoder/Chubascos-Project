import { Suspense } from 'react';
import { getLiveFeed, getEvents, getUsers } from '@/actions/data';
import { HeroSection } from '@/components/templates/HomeTemplate/HeroSection';
import { EventsSection } from '@/components/templates/HomeTemplate/EventsSection';
import { LiveFeedSection } from '@/components/templates/HomeTemplate/LiveFeedSection';
import { UsersSection } from '@/components/templates/HomeTemplate/UsersSection';
import { Footer } from '@/components/organisms/Footer/Footer';
import type { Metadata } from 'next';

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
    getLiveFeed(10),
    getEvents(6),
    getUsers(6),
  ]);

  return (
    <main>
      <HeroSection />
      <Suspense fallback={null}>
        <EventsSection events={eventsResult.items as any} />
      </Suspense>
      <Suspense fallback={null}>
        <LiveFeedSection posts={feedResult.items as any} />
      </Suspense>
      <Suspense fallback={null}>
        <UsersSection users={usersResult.items as any} />
      </Suspense>
      <Footer />
    </main>
  );
}
