'use client';
import { motion, MotionValue } from 'framer-motion';
import styles from './Hero.module.scss';

interface ScrollIndicatorProps {
  opacity: MotionValue<number>;
}

export function ScrollIndicator({ opacity }: ScrollIndicatorProps) {
  return (
    <motion.div className={styles.scrollIndicator} style={{ opacity }}>
      <div className={styles.scrollLine} />
      <span className={styles.scrollText}>SCROLL</span>
    </motion.div>
  );
}
