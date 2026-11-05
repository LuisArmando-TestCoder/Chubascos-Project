'use client';
import { motion, MotionValue } from 'framer-motion';
import i18n from '@/utils/i18n';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import styles from './Hero.module.scss';

interface HeroTitleProps {
  opacity: MotionValue<number>;
}

export function HeroTitle({ opacity }: HeroTitleProps) {
  return (
    <div className={styles.titleContainer}>
      <motion.div className={styles.titleContent} style={{ opacity }}>
        {/* The water renders inside .titleContainer, so mix-blend-mode:
            difference still applies to it; monochrome keeps the wet ink white. */}
        <h1 className={styles.mainTitle}>
          <WaterText text={i18n.home.hero.title} monochrome />
          <div className={styles.inlineSubtitle}>
            <WaterText text={i18n.home.hero.subtitle} monochrome />
          </div>
        </h1>
      </motion.div>
    </div>
  );
}
