'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Link from 'next/link';
import FocusTrap from 'focus-trap-react';
import styles from './Header.module.scss';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = () => {
    setIsOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    setIsOpen(false);
    document.body.style.overflow = '';
  };

  const toggleMenu = () => isOpen ? closeMenu() : openMenu();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const menuVariants: Variants = {
    closed: { 
      opacity: 0, 
      y: -20, 
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } 
    },
    open: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.container}>
          <Link href="/" className={styles.logo} aria-label="Volver al inicio de Chubascos">
            CHUBASCOS
          </Link>
          
          <div className={styles.actions}>
            <Link href="/entrar" className={styles.loginBtn}>
              CONOZCO
            </Link>
            <button 
              className={styles.hamburger} 
              onClick={toggleMenu} 
              aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={isOpen}
              aria-controls="main-menu"
            >
              <div className={`${styles.burgerIcon} ${isOpen ? styles.isOpen : ''}`}>
                <span />
                <span />
              </div>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isOpen && (
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
            <motion.nav 
              id="main-menu"
              className={styles.menu}
              initial="closed"
              animate="open"
              exit="closed"
              variants={menuVariants}
              aria-label="Menú principal"
            >
              <div className={styles.menuContent}>
                <ul className={styles.links} role="list">
                  <motion.li initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Link href="/" onClick={closeMenu}>Inicio</Link>
                  </motion.li>
                  <motion.li initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Link href="/buscar" onClick={closeMenu}>Buscar</Link>
                  </motion.li>
                  <motion.li initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Link href="/guardados" onClick={closeMenu}>Mis Charcos</Link>
                  </motion.li>
                  <motion.li initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Link href="/normas" onClick={closeMenu}>Guía de la Comunidad</Link>
                  </motion.li>
                  <motion.li initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Link href="/privacidad" onClick={closeMenu}>Legal y Privacidad</Link>
                  </motion.li>
                </ul>
              </div>
            </motion.nav>
          </FocusTrap>
        )}
      </AnimatePresence>
    </>
  );
}
