'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Event } from '@/types';
import { cronToHuman } from '@/utils/cronUtils';
import {
  DEFAULT_EVENT_TIME_ZONE, LEGACY_EVENT_TIME_ZONE, eventDateString, eventDayParts, eventStartMs, eventZone, isEventPast, todayIn,
} from '@/utils/eventTime';
import styles from './PoetEvents.module.scss';

interface PoetEventsProps {
  events: Event[];
  /** The poet looking at their own events: edit and repeat links. */
  isOwner?: boolean;
  /** Highlight the event open in the studio. */
  activeId?: string | null;
  title?: string;
  /** Inside a sticky, height-capped column: the list takes the space left. */
  fill?: boolean;
}

type Filter = 'upcoming' | 'past';

const rtf = typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl
  ? new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  : null;

/** "hoy", "mañana", "en 5 días", "hace 3 semanas", on the venue's calendar. */
export function relativeDay(event: Pick<Event, 'day' | 'hour' | 'timeZone'>, now: Date = new Date()): string {
  const date = eventDateString(event);
  if (!date || !rtf) return '';
  const zone = eventZone(event);
  const today = todayIn(zone === LEGACY_EVENT_TIME_ZONE ? DEFAULT_EVENT_TIME_ZONE : zone, now);
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (Math.abs(days) < 14) return rtf.format(days, 'day');
  if (Math.abs(days) < 60) return rtf.format(Math.round(days / 7), 'week');
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}

/**
 * A poet's evenings, for the left-hand column: what's coming and the whole
 * history, in one scrollable rail that sits beside poems instead of under them.
 */
export function PoetEvents({ events, isOwner = false, activeId, title = 'Eventos', fill = false }: PoetEventsProps) {
  // One clock reading per mount keeps server and client renders in agreement.
  const [now] = useState(() => Date.now());
  const { upcoming, past } = useMemo(() => ({
    upcoming: events.filter((e) => !isEventPast(e, now)).sort((a, b) => eventStartMs(a) - eventStartMs(b)),
    past: events.filter((e) => isEventPast(e, now)).sort((a, b) => eventStartMs(b) - eventStartMs(a)),
  }), [events, now]);
  const [filter, setFilter] = useState<Filter>(upcoming.length || !past.length ? 'upcoming' : 'past');
  const list = filter === 'upcoming' ? upcoming : past;

  if (events.length === 0 && !isOwner) return null;

  return (
    <section className={`${styles.rail} ${fill ? styles.fill : ''}`} aria-label={title}>
      <header className={styles.top}>
        <h2 className={styles.heading}>{title}</h2>
        {isOwner && <Link href="/dashboard?tab=evento" className={styles.new}>+ Nuevo</Link>}
      </header>

      {events.length === 0 ? (
        <p className={styles.empty}>Aún no hay eventos. El primero aparecerá aquí.</p>
      ) : (
        <>
          <div className={styles.filters} role="group" aria-label="Mostrar eventos">
            <button type="button" aria-pressed={filter === 'upcoming'} className={styles.filter} onClick={() => setFilter('upcoming')}>
              Próximos <span className={styles.count}>{upcoming.length}</span>
            </button>
            <button type="button" aria-pressed={filter === 'past'} className={styles.filter} onClick={() => setFilter('past')}>
              Historial <span className={styles.count}>{past.length}</span>
            </button>
          </div>

          {list.length === 0 ? (
            <p className={styles.empty}>
              {filter === 'upcoming' ? 'Nada en el horizonte por ahora.' : 'Todavía no hay eventos pasados.'}
            </p>
          ) : (
            // Its own scroller: the page keeps its scroll, the rail keeps its place.
            <ol className={styles.list} data-lenis-prevent tabIndex={0} aria-label={filter === 'upcoming' ? 'Próximos eventos' : 'Eventos pasados'}>
              {list.map((e) => {
                const parts = eventDayParts(e);
                const recurring = e.isRecurring && e.cronExpression;
                return (
                  <li key={e.id} className={styles.item} data-past={filter === 'past' || undefined} data-active={e.id === activeId || undefined}>
                    <span className={styles.tile} aria-hidden="true">
                      <span className={styles.tileDay}>{parts?.d ?? '—'}</span>
                      <span className={styles.tileMonth}>{parts?.m ?? ''}</span>
                    </span>
                    <div className={styles.body}>
                      <Link href={`/e/${encodeURIComponent(e.id)}`} className={styles.title}>{e.title}</Link>
                      <p className={styles.meta}>
                        <span suppressHydrationWarning>{relativeDay(e, new Date(now))}</span>
                        {e.hour && <span>{e.hour}</span>}
                      </p>
                      {e.place && <p className={styles.place}>{e.place}</p>}
                      {recurring && <p className={styles.recurring}><span aria-hidden="true">↻ </span>{cronToHuman(e.cronExpression!)}</p>}
                      {isOwner && (
                        <p className={styles.actions}>
                          <Link href={`/dashboard?edit=event&id=${encodeURIComponent(e.id)}`} className={styles.action} aria-label={`Editar ${e.title}`}>Editar</Link>
                          <Link href={`/dashboard?tab=evento&copy=${encodeURIComponent(e.id)}`} className={styles.action} aria-label={`Repetir ${e.title} en otra fecha`}>Repetir</Link>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}
