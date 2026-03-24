'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import styles from './Header.module.scss';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  const menuVariants = {
    closed: { opacity: 0, x: '100%' },
    open: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        duration: 0.5, 
        ease: [0.22, 1, 0.36, 1] as any 
      } 
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo}>
            CHUBASCOS
          </Link>
          
          <div className={styles.actions}>
            <Link href="/entrar" className={styles.loginBtn}>
              CONOZCO
            </Link>
            <button className={styles.hamburger} onClick={toggleMenu} aria-label="Menú">
              <span className={isOpen ? styles.lineOpen : ''} />
              <span className={isOpen ? styles.lineOpen : ''} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <motion.nav 
            className={styles.menu}
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
          >
            <div className={styles.menuContent}>
              <ul className={styles.links}>
                <li><Link href="/" onClick={toggleMenu}>Inicio</Link></li>
                <li><Link href="/buscar" onClick={toggleMenu}>Buscar</Link></li>
                <li><Link href="/guardados" onClick={toggleMenu}>Mis Charcos</Link></li>
                <li><Link href="/normas" onClick={toggleMenu}>Guía de la Comunidad</Link></li>
                <li><Link href="/privacidad" onClick={toggleMenu}>Legal y Privacidad</Link></li>
              </ul>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
