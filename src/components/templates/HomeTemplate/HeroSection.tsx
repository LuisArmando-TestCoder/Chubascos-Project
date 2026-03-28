'use client';
import { useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import styles from './hero/Hero.module.scss';
import { HeroBackground } from './hero/HeroBackground';
import { HeroTitle } from './hero/HeroTitle';
import { ScrollIndicator } from './hero/ScrollIndicator';

export function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const opacityVideo = useTransform(scrollYProgress, [0, 0.8, 1], [1, 0.5, 0]);
  const opacityContent = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <section 
      ref={containerRef} 
      className={styles.heroWrapper}
    >
      <div className={styles.stickyContainer}>
        <HeroBackground 
          scale={scale}
          opacity={opacityVideo}
        />
        
        <HeroTitle 
          opacity={opacityContent}
        />

        <ScrollIndicator opacity={opacityContent} />
      </div>
    </section>
  );
}
