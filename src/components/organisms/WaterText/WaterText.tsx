'use client';
/**
 * WaterText: a title or a name that washes away under the pointer like ink
 * in a puddle, then re-forms. Rendering lives in `@/lib/water/waterText`
 * (one shared WebGL context for every instance on the page).
 *
 * The real text stays in the DOM, so it stays readable, selectable,
 * translatable and indexable. Only its paint is replaced by the canvas, and
 * only once the canvas is ready. With reduced motion or no WebGL, it stays
 * plain text.
 */
import { useEffect, useRef, type ElementType } from 'react';
import { waterText } from '@/lib/water/waterText';
import styles from './WaterText.module.scss';

interface WaterTextProps {
  text: string;
  /** Element to render as. Default `span` (put it inside your heading or link). */
  as?: ElementType;
  className?: string;
  /** Sit inline with surrounding text instead of taking the full line. */
  inline?: boolean;
  /** Wet strokes stay in the text's own colour (for blend-mode contexts). */
  monochrome?: boolean;
}

export function WaterText({ text, as: Tag = 'span', className = '', inline = false, monochrome = false }: WaterTextProps) {
  const hostRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const span = textRef.current;
    const canvas = canvasRef.current;
    if (!host || !span || !canvas) return;
    const engine = waterText();
    const item = engine.register(host, span, canvas, text, { monochrome });
    if (!item) return;
    engine.kick();
    return () => engine.unregister(item);
  }, [text, monochrome]);

  return (
    <Tag ref={hostRef} className={`${styles.host} ${inline ? styles.inline : ''} ${className}`}>
      <span ref={textRef} className={styles.text}>{text}</span>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </Tag>
  );
}
