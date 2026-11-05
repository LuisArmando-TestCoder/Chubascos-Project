'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Event } from '@/types';
import { cronToHuman } from '@/utils/cronUtils';
import {
  DEFAULT_EVENT_TIME_ZONE, LEGACY_EVENT_TIME_ZONE, eventDateString, eventDayParts, eventStartMs, eventZone, isEventPast, todayIn,
} from '@/utils/eventTime';
import { Choice } from './studio/Choice';
import styles from './DashboardEventsList.module.scss';

interface DashboardEventsListProps {
  events: Event[];
  activeId?: string | null;
  /** "Repetir": copy an event into a fresh form. */
  onDuplicate?: (event: Event) => void;
}

type Filter = 'upcoming' | 'past';

const rtf = typeof Intl !== 'undefined' && 'RelativeTimeFormat' in Intl
  ? new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  : null;

/** "hoy", "mañana", "en 5 días", "hace 3 semanas", on the venue's calendar. */
export function relativeDay(event: Event, now: Date = new Date()): string {
  const date = eventDateString(event);
  if (!date || !rtf) return '';
  const zone = eventZone(event);
  const today = todayIn(zone === LEGACY_EVENT_TIME_ZONE ? DEFAULT_EVENT_TIME_ZONE : zone, now);
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (Math.abs(days) < 14) return rtf.format(days, 'day');
  if (Math.abs(days) < 60) return rtf.format(Math.round(days / 7), 'week');
  return rtf.format(Math.round(days / 30), 'month');
}

/** "noviembre de 2026", from the date the poet chose. */
function monthKey(event: Event): string {
  const date = eventDateString(event);
  if (!date) return 'Sin fecha';
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('es-CR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * The poet's events as a record: what's coming, what already rained.
 * Grouped by month on a rail, newest-first for the past.
 */
export function DashboardEventsList({ events, activeId, onDuplicate }: DashboardEventsListProps) {
  // One clock reading per mount keeps server and client renders in agreement.
  const [now] = useState(() => Date.now());
  const { upcoming, past } = useMemo(() => {
    return {
      upcoming: events.filter((e) => !isEventPast(e, now)).sort((a, b) => eventStartMs(a) - eventStartMs(b)),
      past: events.filter((e) => isEventPast(e, now)).sort((a, b) => eventStartMs(b) - eventStartMs(a)),
    };
  }, [events, now]);
  const [filter, setFilter] = useState<Filter>(upcoming.length || !past.length ? 'upcoming' : 'past');
  const list = filter === 'upcoming' ? upcoming : past;

  const groups = useMemo(() => {
    const out: { key: string; items: Event[] }[] = [];
    for (const e of list) {
      const key = monthKey(e);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(e);
      else out.push({ key, items: [e] });
    }
    return out;
  }, [list]);

  if (events.length === 0) {
    return (
      <section className={styles.container} aria-label="Tus eventos">
        <h3 className={styles.heading}>Tus eventos</h3>
        <p className={styles.empty}>Aún no has convocado ninguno. El primero aparecerá aquí, con su historia.</p>
      </section>
    );
  }

  return (
    <section className={styles.container} aria-label="Tus eventos">
      <div className={styles.top}>
        <h3 className={styles.heading}>Tus eventos</h3>
        <Choice<Filter>
          legend="Mostrar"
          variant="segmented"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'upcoming', label: `Próximos · ${upcoming.length}` },
            { value: 'past', label: `Historial · ${past.length}` },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <p className={styles.empty}>
          {filter === 'upcoming' ? 'Nada en el horizonte. Repite uno del historial o crea otro.' : 'Todavía no hay eventos pasados.'}
        </p>
      ) : (
        groups.map((g) => (
          <div key={g.key} className={styles.group}>
            <p className={styles.month}>{g.key}</p>
            <ol className={styles.list}>
              {g.items.map((e) => {
                const parts = eventDayParts(e);
                const recurring = e.isRecurring && e.cronExpression;
                return (
                  <li key={e.id} className={styles.item} data-active={e.id === activeId || undefined} data-past={filter === 'past' || undefined}>
                    <span className={styles.tile} aria-hidden="true">
                      <span className={styles.tileDay}>{parts?.d ?? '—'}</span>
                      <span className={styles.tileMonth}>{parts?.m ?? ''}</span>
                    </span>
                    <div className={styles.body}>
                      <p className={styles.title}>{e.title}</p>
                      <p className={styles.meta}>
                        <span suppressHydrationWarning>{relativeDay(e)}</span>
                        {e.hour && <span>{e.hour}</span>}
                        {e.place && <span className={styles.place}>{e.place}</span>}
                      </p>
                      {recurring && (
                        <p className={styles.recurring}><span aria-hidden="true">↻ </span>{cronToHuman(e.cronExpression!)}</p>
                      )}
                    </div>
                    <div className={styles.actions}>
                      <Link href={`/dashboard?edit=event&id=${encodeURIComponent(e.id)}`} className={styles.action}
                        aria-current={e.id === activeId ? 'page' : undefined} aria-label={`Editar ${e.title}`}>
                        Editar
                      </Link>
                      <Link href={`/e/${encodeURIComponent(e.id)}`} className={styles.action} aria-label={`Ver ${e.title}`}>Ver</Link>
                      {onDuplicate && (
                        <button type="button" className={styles.action} onClick={() => onDuplicate(e)} aria-label={`Repetir ${e.title} en otra fecha`}>
                          Repetir
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))
      )}
    </section>
  );
}
