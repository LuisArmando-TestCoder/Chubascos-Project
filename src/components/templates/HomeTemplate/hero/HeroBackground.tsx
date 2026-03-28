'use client';
import { motion, MotionValue } from 'framer-motion';
import styles from './Hero.module.scss';
import { ShaderCanvas } from './ShaderCanvas';
import { HERO_SHADER } from './constants';

interface HeroBackgroundProps {
  scale: MotionValue<number>;
  opacity: MotionValue<number>;
}

export function HeroBackground({ scale, opacity }: HeroBackgroundProps) {
  return (
    <motion.div 
      className={styles.videoContainer}
      style={{ scale, opacity }}
    >
      <ShaderCanvas shader={HERO_SHADER} />
    </motion.div>
  );
}
