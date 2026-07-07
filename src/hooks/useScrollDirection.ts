import { useState, useEffect } from 'react';
import { useLenis } from 'lenis/react';

export function useScrollDirection() {
  const [isHidden, setIsHidden] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    let lastScrollY = 0;
    const threshold = 10;

    const handleScroll = ({ scroll }: { scroll: number }) => {
      const currentScrollY = scroll;
      const diff = currentScrollY - lastScrollY;

      if (Math.abs(diff) < threshold) return;

      if (diff > 0 && currentScrollY > 100) {
        setIsHidden(true);
      } else if (diff < 0) {
        setIsHidden(false);
      }

      lastScrollY = currentScrollY;
    };

    lenis.on('scroll', handleScroll);

    return () => {
      lenis.off('scroll', handleScroll);
    };
  }, [lenis]);

  return isHidden;
}
