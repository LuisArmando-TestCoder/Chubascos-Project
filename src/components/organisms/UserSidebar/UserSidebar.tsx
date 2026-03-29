'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useSession } from '@/hooks/useSession';
import { QrModal } from '@/components/organisms/QrModal/QrModal';
import type { User } from '@/types';
import styles from './UserSidebar.module.scss';

interface UserSidebarProps {
  user: User;
}

export function UserSidebar({ user }: UserSidebarProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const { isUserSaved, saveUser, unsaveUser } = useSavedItems();
  const { session } = useSession();

  const isSaved = isUserSaved(user.id);
  const isOwner = session.isLoggedIn && session.userId === user.id;
  const name = user.username || user.email.split('@')[0];
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/${user.id}` : `/u/${user.id}`;

  return (
    <aside className={styles.sidebar}>
      <header className={styles.profileHeader}>
        <div className={styles.avatarBlock}>
          <div className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</div>
          <span className={styles.label}>Perfil Verificado</span>
        </div>

        <h1 className={styles.name}>{name}</h1>

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
                onClick={() => isSaved ? unsaveUser(user.id) : saveUser(user.id)}
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
          <h3 className={styles.sidebarTitle}>Canales digitales</h3>
          <div className={styles.linksList}>
            {user.contacts.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                {c.label} →
              </a>
            ))}
          </div>
        </section>
      )}

      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} url={profileUrl} label={name} />
    </aside>
  );
}
