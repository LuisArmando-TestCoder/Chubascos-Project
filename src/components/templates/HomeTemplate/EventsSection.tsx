import Link from 'next/link';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { SectionHeader } from '@/components/molecules/SectionHeader/SectionHeader';
import i18n from '@/utils/i18n';
import type { Event, Tag } from '@/types';
import styles from './HomeTemplate.module.scss';

interface EventsSectionProps {
  events: Event[];
  tagMap?: Record<string, Tag>;
}

export function EventsSection({ events, tagMap = {} }: EventsSectionProps) {
  if (events.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="events-heading">
      <div className={styles.sectionInner}>
        <SectionHeader
          id="events-heading"
          index={2}
          total={4}
          kicker="Lo que viene"
          title={i18n.home.events.title}
          echo="encuentros"
        />
        <ul className={styles.eventsGrid}>
          {events.map((event) => (
            <li key={event.id}>
              <EventCard
                event={event}
                tags={(event.tagIds || []).map((id) => tagMap[id]).filter(Boolean) as Tag[]}
              />
            </li>
          ))}
        </ul>
        <div className={styles.sectionCta}>
          <Link href="/buscar?type=events" className={styles.ctaBtn}>
            {i18n.common.seeMore}
          </Link>
        </div>
      </div>
    </section>
  );
}
