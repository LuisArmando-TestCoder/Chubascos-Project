'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { HamburgerMenu } from '@/components/organisms/HamburgerMenu/HamburgerMenu';
import { useSavedStore } from '@/store/saved';
import { useSession } from '@/hooks/useSession';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { drop } from '@/lib/fluid/bus';
import i18n from '@/utils/i18n';
import styles from './Header.module.scss';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const isHidden = useScrollDirection();
  const { posts, users, events } = useSavedStore();
  const { session, username, loading } = useSession();
  const savedCount = posts.length + users.length + events.length;

  const displayName = session.isLoggedIn
    ? (username || session.email.split('@')[0] || 'Panel')
    : null;

  const toggleMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    drop(r.left + r.width / 2, r.top + r.height / 2, { tone: 'rain', power: 1.2, radius: 30 });
    setMenuOpen((open) => !open);
  }, []);

  // Escape closes the menu from anywhere.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <>
      <button
        type="button"
        className={styles.hamWrapper}
        onClick={toggleMenu}
        aria-expanded={menuOpen}
        aria-controls="menu-principal"
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        <svg
          className={`${styles.ham} ${styles.hamRotate} ${styles.ham4} ${menuOpen ? styles.active : ''}`}
          viewBox="0 0 100 100"
          width="56"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className={`${styles.line} ${styles.top}`}
            d="m 70,33 h -40 c 0,0 -8.5,-0.149796 -8.5,8.5 0,8.649796 8.5,8.5 8.5,8.5 h 20 v -20"
          />
          <path
            className={`${styles.line} ${styles.middle}`}
            d="m 70,50 h -40"
          />
          <path
            className={`${styles.line} ${styles.bottom}`}
            d="m 30,67 h 40 c 0,0 8.5,0.149796 8.5,-8.5 0,-8.649796 -8.5,-8.5 -8.5,-8.5 h -20 v 20"
          />
        </svg>
      </button>

      <header className={`${styles.header} ${isHidden && !menuOpen ? styles.hidden : ''}`} role="banner">
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="Chubascos, inicio">
            <span className={styles.logoDrop} aria-hidden="true" />
            <span className={styles.logoWord}>Chubascos</span>
          </Link>
          <nav className={styles.actions} aria-label="Acciones principales">
            <Link href="/buscar" className={styles.navLink}>
              {i18n.common.search}
            </Link>
            {savedCount > 0 && (
              <Link href="/guardados" className={styles.saved} aria-label={`${savedCount} elementos guardados`}>
                <span className={styles.savedCount} aria-hidden="true">{savedCount}</span>
                <span className={styles.savedLabel} aria-hidden="true">{i18n.common.saved}</span>
              </Link>
            )}
            {!loading && (
              <Link
                href={session.isLoggedIn ? '/dashboard' : '/entrar'}
                className={styles.loginBtn}
                aria-label={session.isLoggedIn ? `Panel de ${displayName}` : 'Entrar a la plataforma'}
              >
                {displayName ?? i18n.common.login}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <HamburgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        isLoggedIn={session.isLoggedIn}
        email={session.email}
      />
    </>
  );
}
