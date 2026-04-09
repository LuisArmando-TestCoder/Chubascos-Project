import Link from 'next/link';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import { cronToHuman } from '@/utils/cronUtils';
import type { Event, Tag } from '@/types';
import styles from './EventCard.module.scss';

interface EventCardProps {
  event: Event;
  tags?: Tag[];
  expired?: boolean;
}

export function EventCard({ event, tags = [], expired = false }: EventCardProps) {
  const isRecurring = event.isRecurring && event.cronExpression;
  const scheduleLabel = isRecurring ? cronToHuman(event.cronExpression!) : null;

  return (
    <article className={`${styles.card} ${expired ? styles.expired : ''} ${isRecurring ? styles.recurring : ''}`}>
      <Link href={`/e/${event.id}`} className={styles.inner}>
        {isRecurring && (
          <div className={styles.recurringBadge}>
            <span className={styles.recurringIcon}>↻</span>
            <span className={styles.recurringLabel}>Evento recurrente</span>
          </div>
        )}
        <div className={styles.dateLine}>
          <span className={styles.day}>
            {event.day ? formatDate(event.day) : '—'}
          </span>
          <span className={styles.hour}>{event.hour}</span>
          {expired && <span className={styles.expiredBadge}>expirado</span>}
        </div>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.place}>{event.place}</p>
        {event.price !== undefined && (
          <p className={styles.price}>
            {event.price === 0 ? 'Entrada libre' : `₡${event.price.toLocaleString('es-CR')}`}
          </p>
        )}
        {event.description && (
          <p className={styles.desc}>
            {event.description.slice(0, 100)}{event.description.length > 100 ? '…' : ''}
          </p>
        )}
      </Link>
      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.slice(0, 4).map((tag) => (
            <TagPill key={tag.id} value={tag.value} tagId={tag.id} size="sm" />
          ))}
        </div>
      )}
    </article>
  );
}
