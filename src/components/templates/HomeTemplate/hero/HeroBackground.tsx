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
      <ShaderCanvas 
        shader={HERO_SHADER}
        iChannel2="https://images.pexels.com/photos/2422569/pexels-photo-2422569.jpeg"
      />
    </motion.div>
  );
}
