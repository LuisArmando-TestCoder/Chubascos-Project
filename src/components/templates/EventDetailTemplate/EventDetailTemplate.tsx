'use client';
import { useState } from 'react';
import Link from 'next/link';
import { QrModal } from '@/components/organisms/QrModal/QrModal';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import { useSavedItems } from '@/hooks/useSavedItems';
import i18n from '@/utils/i18n';
import type { Event } from '@/types';
import styles from './EventDetailTemplate.module.scss';

interface EventDetailTemplateProps {
  event: Event;
  tags?: Tag[];
}

export function EventDetailTemplate({ event, tags = [] }: EventDetailTemplateProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const { isEventSaved, saveEvent, unsaveEvent } = useSavedItems();
  const isSaved = isEventSaved(event.id);
  const eventUrl = typeof window !== 'undefined' ? `${window.location.origin}/e/${event.id}` : `/e/${event.id}`;

  return (
    <main className={styles.page}>
      <div className={styles.contentGrid}>
        <article className={styles.article}>
          <header className={styles.header}>
            <div className={styles.meta}>
              <div className={styles.dateBlock}>
                <span className={styles.label}>Fecha</span>
                <span className={styles.day}>{event.day ? formatDate(event.day) : '—'}</span>
              </div>
              <div className={styles.hourBlock}>
                <span className={styles.label}>Hora</span>
                <span className={styles.hour}>{event.hour}</span>
              </div>
            </div>
            
            <h1 className={styles.title}>{event.title}</h1>
            
            <div className={styles.locationBlock}>
              <span className={styles.label}>Ubicación</span>
              <p className={styles.place}>{event.place}</p>
            </div>

            {event.price !== undefined && (
              <div className={styles.priceBlock}>
                <span className={styles.label}>Entrada</span>
                <p className={styles.price}>
                  {event.price === 0 ? i18n.event.priceFree : `₡${event.price.toLocaleString('es-CR')}`}
                </p>
              </div>
            )}
          </header>

          <section className={styles.mainInfo}>
            {event.description && (
              <div className={styles.description}>
                <p className={styles.label}>Sobre el evento</p>
                <div className={styles.descText}>{event.description}</div>
              </div>
            )}

            {tags.length > 0 && (
              <div className={styles.tagsSection}>
                <p className={styles.label}>Etiquetas</p>
                <div className={styles.tags}>
                  {tags.map((tag) => (
                    <TagPill key={tag.id} tagId={tag.id} value={tag.value} size="sm" />
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className={styles.interaction}>
             <div className={styles.actions}>
              <button
                className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
                onClick={() => isSaved ? unsaveEvent(event.id) : saveEvent(event.id)}
              >
                {isSaved ? 'Agendado' : 'Guardar Evento'}
              </button>
              <button className={styles.qrBtn} onClick={() => setQrOpen(true)}>
                Obtener Pase QR
              </button>
            </div>
          </section>
        </article>

        <aside className={styles.sidebar}>
          {event.urls?.length > 0 && (
            <section className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Enlaces oficiales</h3>
              <div className={styles.linksList}>
                {event.urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                    {new URL(url).hostname} →
                  </a>
                ))}
              </div>
            </section>
          )}

          {event.contacts?.length > 0 && (
            <section className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Contacto directo</h3>
              <div className={styles.contactsList}>
                {event.contacts.map((c, i) => (
                  <span key={i} className={styles.contactItem}>{c}</span>
                ))}
              </div>
            </section>
          )}

          <div className={styles.organizerSection}>
             <span className={styles.label}>Organizado por</span>
             <Link href={`/u/${event.ownerUserId}`} className={styles.ownerLink}>
                Ver perfil del autor
             </Link>
          </div>
        </aside>
      </div>

      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} url={eventUrl} label={event.title} />
    </main>
  );
}
