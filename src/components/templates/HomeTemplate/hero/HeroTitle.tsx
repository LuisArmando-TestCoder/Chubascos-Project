'use client';
import { motion, MotionValue } from 'framer-motion';
import i18n from '@/utils/i18n';
import styles from './Hero.module.scss';

interface HeroTitleProps {
  opacity: MotionValue<number>;
}

export function HeroTitle({ opacity }: HeroTitleProps) {
  return (
    <div className={styles.titleContainer}>
      <motion.div className={styles.titleContent} style={{ opacity }}>
        <h1 className={styles.mainTitle}>
          {i18n.home.hero.title}
          <div className={styles.inlineSubtitle}>
            {i18n.home.hero.subtitle}
          </div>
        </h1>
      </motion.div>
    </div>
  );
}
