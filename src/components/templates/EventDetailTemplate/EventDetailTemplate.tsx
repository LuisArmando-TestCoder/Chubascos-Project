'use client';
import { useState } from 'react';
import Link from 'next/link';
import { QrModal } from '@/components/organisms/QrModal/QrModal';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import { useSavedItems } from '@/hooks/useSavedItems';
import type { Event } from '@/types';
import styles from './EventDetailTemplate.module.scss';

interface EventDetailTemplateProps {
  event: Event;
}

export function EventDetailTemplate({ event }: EventDetailTemplateProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const { isEventSaved, saveEvent, unsaveEvent } = useSavedItems();
  const isSaved = isEventSaved(event.id);
  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/e/${event.id}` : `/e/${event.id}`;

  return (
    <div className={styles.page}>
      <article className={styles.article}>
        <header className={styles.header}>
          <div className={styles.dateLine}>
            <span className={styles.day}>{event.day ? formatDate(event.day) : '—'}</span>
            <span className={styles.hour}>{event.hour}</span>
          </div>
          <h1 className={styles.title}>{event.title}</h1>
          <p className={styles.place}>{event.place}</p>
          {event.price !== undefined && (
            <p className={styles.price}>
              {event.price === 0 ? 'Entrada libre' : `₡${event.price.toLocaleString('es-CR')}`}
            </p>
          )}
        </header>

        {event.description && (
          <section className={styles.description}>
            <p>{event.description}</p>
          </section>
        )}

        {event.tagIds?.length > 0 && (
          <div className={styles.tags}>
            {event.tagIds.map((id) => (
              <TagPill key={id} tagId={id} value={id} size="sm" />
            ))}
          </div>
        )}

        {event.urls?.length > 0 && (
          <section className={styles.links}>
            <h2 className={styles.linksTitle}>Enlaces</h2>
            <ul>
              {event.urls.map((url, i) => (
                <li key={i}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {event.contacts?.length > 0 && (
          <section className={styles.contactsSection}>
            <h2 className={styles.linksTitle}>Contacto</h2>
            <ul>
              {event.contacts.map((c, i) => (
                <li key={i} className={styles.contactItem}>{c}</li>
              ))}
            </ul>
          </section>
        )}

        <footer className={styles.footer}>
          <div className={styles.footerActions}>
            <button
              className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
              onClick={() => isSaved ? unsaveEvent(event.id) : saveEvent(event.id)}
              aria-label={isSaved ? 'Dejar de guardar evento' : 'Guardar evento'}
            >
              {isSaved ? 'Guardado' : 'Guardar'}
            </button>
            <button
              className={styles.qrBtn}
              onClick={() => setQrOpen(true)}
              aria-label="Ver código QR del evento"
            >
              QR
            </button>
          </div>
          <Link href={`/u/${event.ownerUserId}`} className={styles.ownerLink}>
            ← Perfil del organizador
          </Link>
        </footer>
      </article>

      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} url={eventUrl} label={event.title} />
    </div>
  );
}
