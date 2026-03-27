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
            <button
              className={`${styles.hamburger} ${menuOpen ? styles.active : ''}`}
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              aria-controls="main-menu"
            >
              <span />
              <span />
              <span />
            </button>
          </nav>
        </div>
      </header>
      <HamburgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
