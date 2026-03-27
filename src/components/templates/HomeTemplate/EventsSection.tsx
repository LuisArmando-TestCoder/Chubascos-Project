'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import i18n from '@/utils/i18n';
import type { Event } from '@/types';
import styles from './HomeTemplate.module.scss';

interface EventsSectionProps {
  events: Event[];
}

export function EventsSection({ events }: EventsSectionProps) {
  if (events.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="events-heading">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="events-heading">{i18n.home.events.title}</h2>
        </header>
        <div className={styles.eventsGrid}>
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: [0.25, 1, 0.5, 1] }}
              viewport={{ once: true }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
        <div className={styles.sectionCta}>
          <Link href="/buscar?type=events" className={styles.ctaBtn}>
            {i18n.common.seeMore}
          </Link>
          <Link href="/buscar?type=events" className={styles.ctaBtnGhost}>
            {i18n.common.search}
          </Link>
        </div>
      </div>
    </section>
  );
}
