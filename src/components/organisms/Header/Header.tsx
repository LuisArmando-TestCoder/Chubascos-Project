'use client';
import { useState } from 'react';
import Link from 'next/link';
import { HamburgerMenu } from '@/components/organisms/HamburgerMenu/HamburgerMenu';
import { useSavedStore } from '@/store/saved';
import { useSession } from '@/hooks/useSession';
import i18n from '@/utils/i18n';
import styles from './Header.module.scss';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { posts, users, events } = useSavedStore();
  const { session } = useSession();
  const savedCount = posts.length + users.length + events.length;

  return (
    <>
      <div className={styles.hamWrapper} onClick={() => setMenuOpen(!menuOpen)}>
        <svg
          className={`${styles.ham} ${styles.hamRotate} ${styles.ham4} ${menuOpen ? styles.active : ''}`}
          viewBox="0 0 100 100"
          width="60"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
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
      </div>

      <header className={styles.header} role="banner">
        <div className={styles.inner}>
          <Link href="/" className={styles.logo} aria-label="Chubascos - inicio">
            CHUBASCOS
          </Link>
          <nav className={styles.actions} aria-label="Acciones principales">
            {savedCount > 0 && (
              <Link href="/guardados" className={styles.saved} aria-label={`${savedCount} elementos guardados`}>
                <span className={styles.savedCount}>{savedCount}</span>
                <span className={styles.savedLabel}>{i18n.common.saved}</span>
              </Link>
            )}
            <Link
              href={session.isLoggedIn ? '/dashboard' : '/entrar'}
              className={styles.loginBtn}
              aria-label={session.isLoggedIn ? 'Ir al panel' : 'Entrar a la plataforma'}
            >
              {session.isLoggedIn ? 'Panel' : i18n.common.login}
            </Link>
          </nav>
        </div>
      </header>
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
