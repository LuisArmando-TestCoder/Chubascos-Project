'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import FocusTrap from 'focus-trap-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './HamburgerMenu.module.scss';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { href: '/buscar', label: 'Buscar' },
  { href: '/guardados', label: 'Guardados' },
  { href: '/normas', label: 'Normas de comunidad' },
  { href: '/privacidad', label: 'Tu obra, tu derecho' },
  { href: '/entrar', label: 'Entrar' },
];

const ease1: [number, number, number, number] = [0.76, 0, 0.24, 1];
const ease2: [number, number, number, number] = [0.25, 1, 0.5, 1];

const menuVariants = {
  hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
  visible: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.55, ease: ease1 },
  },
  exit: {
    opacity: 0,
    clipPath: 'inset(0 0 100% 0)',
    transition: { duration: 0.45, ease: ease1 },
  },
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease2 } },
};

export function HamburgerMenu({ isOpen, onClose }: HamburgerMenuProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap>
          <motion.div
            className={styles.overlay}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              ✕
            </button>
            <motion.nav
              className={styles.nav}
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {links.map((link) => (
                <motion.div key={link.href} variants={itemVariants}>
                  <Link href={link.href} className={styles.link} onClick={onClose}>
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
