import Link from 'next/link';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import type { Event, Tag } from '@/types';
import styles from './EventCard.module.scss';

interface EventCardProps {
  event: Event;
  tags?: Tag[];
}

export function EventCard({ event, tags = [] }: EventCardProps) {
  return (
    <article className={styles.card}>
      <Link href={`/e/${event.id}`} className={styles.inner}>
        <div className={styles.dateLine}>
          <span className={styles.day}>
            {event.day ? formatDate(event.day) : '—'}
          </span>
          <span className={styles.hour}>{event.hour}</span>
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
