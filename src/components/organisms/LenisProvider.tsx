'use client';

import { ReactLenis } from 'lenis/react';
import { ReactNode, useEffect, useState } from 'react';

interface LenisProviderProps {
  children: ReactNode;
}

export function LenisProvider({ children }: LenisProviderProps) {
  // Smooth scrolling is motion: people who ask for less get native scrolling.
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduce(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <ReactLenis root options={{ lerp: reduce ? 1 : 0.1, duration: reduce ? 0 : 1.5, smoothWheel: !reduce }}>
      {children}
    </ReactLenis>
  );
}
