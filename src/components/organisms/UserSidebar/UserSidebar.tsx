'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useSession } from '@/hooks/useSession';
import { QrModal } from '@/components/organisms/QrModal/QrModal';
import { DropSigil } from '@/components/atoms/DropSigil/DropSigil';
import { plume } from '@/lib/fluid/bus';
import type { Event, User } from '@/types';
import { PoetEvents } from '@/components/organisms/PoetEvents/PoetEvents';
import styles from './UserSidebar.module.scss';
import { WaterText } from '@/components/organisms/WaterText/WaterText';

interface UserSidebarProps {
  user: User;
  /** The poet's events, shown as a scrollable rail in this column. */
  events?: Event[];
}

export function UserSidebar({ user, events }: UserSidebarProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const { isUserSaved, saveUser, unsaveUser } = useSavedItems();
  const { session } = useSession();

  const isSaved = isUserSaved(user.id);
  const isOwner = session.isLoggedIn && session.userId === user.id;
  const name = user.username || user.email.split('@')[0];
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/${user.id}` : `/u/${user.id}`;

  return (
    <aside className={styles.sidebar} data-lenis-prevent>
      <header className={styles.profileHeader}>
        <div className={styles.avatarBlock}>
          <div className={styles.avatar} aria-hidden="true">
            <DropSigil name={name} size="100%" glyph={name.slice(0, 1).toUpperCase()} />
          </div>
          <span className={styles.label}>Voz en el registro</span>
        </div>

        <h1 className={styles.name}><WaterText text={name} /></h1>

        <div className={styles.bioBlock}>
          <span className={styles.label}>Biografía</span>
          {user.bio ? (
            <div className={styles.bioText}>{user.bio}</div>
          ) : (
            <p className={styles.emptyBio}>Este poeta aún no ha compartido su historia.</p>
          )}
        </div>

        <div className={styles.interaction}>
          <div className={styles.actions}>
            {isOwner ? (
              <Link href="/dashboard" className={styles.editBtn}>
                Editar Perfil
              </Link>
            ) : (
              <button
                className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
                onClick={(e) => {
                  if (isSaved) unsaveUser(user.id);
                  else { saveUser(user.id); plume(e.currentTarget, 'rain'); }
                }}
                aria-pressed={isSaved}
              >
                {isSaved ? 'Siguiendo' : 'Seguir Poeta'}
              </button>
            )}
            <button className={styles.qrBtn} onClick={() => setQrOpen(true)}>
              Compartir Perfil
            </button>
          </div>
        </div>
      </header>

      {user.contacts && user.contacts.length > 0 && (
        <section className={styles.sidebarSection}>
          <h3 className={styles.sidebarTitle}><WaterText text="Canales digitales" /></h3>
          <div className={styles.linksList}>
            {user.contacts.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                {c.label} <span aria-hidden="true">↗</span>
                <span className="visually-hidden"> (se abre en otra pestaña)</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {events && <PoetEvents events={events} isOwner={isOwner} fill />}

      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} url={profileUrl} label={name} />
    </aside>
  );
}
