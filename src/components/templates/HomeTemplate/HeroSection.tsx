'use client';
import { motion, useReducedMotion } from 'framer-motion';
import styles from './HomeTemplate.module.scss';

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HeroSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <motion.h1
          className={styles.heroTitle}
          initial={prefersReduced ? false : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease }}
        >
          CHUBASCOS
        </motion.h1>
        <motion.p
          className={styles.heroSub}
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          Lluvias repentinas dejando charcos
        </motion.p>
      </div>
    </section>
  );
}
