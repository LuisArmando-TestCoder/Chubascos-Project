import Link from 'next/link';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { DropField } from '@/components/atoms/DropField/DropField';
import { formatDate } from '@/utils/formatDate';
import { cronToHuman } from '@/utils/cronUtils';
import type { Event, Tag } from '@/types';
import styles from './EventCard.module.scss';

interface EventCardProps {
  event: Event;
  tags?: Tag[];
  expired?: boolean;
}

function dayParts(ts: unknown): { d: string; m: string } | null {
  if (!ts || typeof ts !== 'object' || !('seconds' in ts)) return null;
  const date = new Date((ts as { seconds: number }).seconds * 1000);
  return {
    d: date.toLocaleDateString('es-CR', { day: '2-digit' }),
    m: date.toLocaleDateString('es-CR', { month: 'short' }).replace('.', ''),
  };
}

export function EventCard({ event, tags = [], expired = false }: EventCardProps) {
  const isRecurring = event.isRecurring && event.cronExpression;
  const scheduleLabel = isRecurring ? cronToHuman(event.cronExpression!) : null;
  const parts = dayParts(event.day);

  return (
    <article
      className={`${styles.card} ${expired ? styles.expired : ''} ${isRecurring ? styles.recurring : ''}`}
      data-drop="puddle"
    >
      <div className={styles.calendar} aria-hidden="true">
        <DropField seed={event.id} tint={isRecurring ? 'ember' : 'puddle'} density={0.45} />
        {parts && (
          <span className={styles.calDay}>
            <span className={styles.calNum}>{parts.d}</span>
            <span className={styles.calMonth}>{parts.m}</span>
          </span>
        )}
      </div>

      <div className={styles.body}>
        {isRecurring && (
          <div className={styles.recurringBadge}>
            <span className={styles.recurringIcon} aria-hidden="true">↻</span>
            <span className={styles.recurringLabel}>{scheduleLabel || 'Evento recurrente'}</span>
          </div>
        )}
        <div className={styles.dateLine}>
          <span className={styles.day}>
            {event.day ? formatDate(event.day) : '—'}
          </span>
          <span className={styles.hour}>{event.hour}</span>
          {expired && <span className={styles.expiredBadge}>expirado</span>}
        </div>
        <h3 className={styles.title}>
          <Link href={`/e/${event.id}`} className={styles.inner}>{event.title}</Link>
        </h3>
        <p className={styles.place}>{event.place}</p>
        {event.price !== undefined && (
          <p className={styles.price}>
            {event.price === 0 ? 'Entrada libre' : `₡${event.price.toLocaleString('es-CR')}`}
          </p>
        )}
        {event.description && (
          <p className={styles.desc}>
            {event.description.slice(0, 110)}{event.description.length > 110 ? '…' : ''}
          </p>
        )}
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.slice(0, 4).map((tag) => (
              <TagPill key={tag.id} value={tag.value} tagId={tag.id} size="sm" />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
