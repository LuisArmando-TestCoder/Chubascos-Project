'use client';
/**
 * DropField: a small pane of real rain (the hero's water, in miniature).
 * Sits behind its parent's content (z-index -1). The parent needs
 * `position: relative; isolation: isolate`. Hovering the parent drops a
 * raindrop under the pointer.
 */
import { useEffect, useRef } from 'react';
import { dropRenderer, type DropTint, type DropFieldHandle } from '@/lib/drops/dropRenderer';
import styles from './DropField.module.scss';

interface DropFieldProps {
  seed: string;
  tint?: DropTint;
  /** 0..1 share of grid cells that are raining. */
  density?: number;
  className?: string;
}

export function DropField({ seed, tint = 'rain', density = 0.25, className = '' }: DropFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = dropRenderer();
    const field: DropFieldHandle | null = renderer.register(canvas, { seed, tint, density });
    if (!field) return;
    canvas.dataset.live = 'true';

    const host = canvas.parentElement;
    let lastPoke = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastPoke < 650) return; // one drop at a time, like real rain
      lastPoke = now;
      renderer.poke(field, e.clientX, e.clientY);
    };
    host?.addEventListener('pointerenter', onMove);
    host?.addEventListener('pointermove', onMove);
    return () => {
      host?.removeEventListener('pointerenter', onMove);
      host?.removeEventListener('pointermove', onMove);
      renderer.unregister(field);
    };
  }, [seed, tint, density]);

  return <canvas ref={ref} className={`${styles.field} ${className}`} aria-hidden="true" />;
}
