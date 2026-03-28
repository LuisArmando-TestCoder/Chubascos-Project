import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getEvent, getTagsByIds } from '@/actions/data';
import { EventDetailTemplate } from '@/components/templates/EventDetailTemplate/EventDetailTemplate';
import { Footer } from '@/components/organisms/Footer/Footer';

interface Props {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) return { title: 'Evento no encontrado | Chubascos' };
  return {
    title: `${event.title} | Chubascos`,
    description: event.description || event.place,
    openGraph: { title: event.title, description: event.description || '' },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const tags = await getTagsByIds(event.tagIds || []);

  return (
    <>
      <EventDetailTemplate event={event} tags={tags} />
      <Footer />
    </>
  );
}
