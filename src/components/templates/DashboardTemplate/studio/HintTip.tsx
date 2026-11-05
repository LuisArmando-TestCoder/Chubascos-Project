'use client';
import {
  Children, cloneElement, isValidElement, useCallback, useEffect, useId, useRef, useState,
  type ReactElement, type ReactNode,
} from 'react';
import styles from './HintTip.module.scss';

interface HintTipProps {
  /** What the help says. Plain text or inline markup (<em>, <code>…). */
  children: ReactNode;
  /** Accessible name of the trigger, e.g. "Ayuda: Versos". */
  label: string;
  /** Element whose hover also opens the tip (e.g. the stage header). */
  hoverZone?: React.RefObject<HTMLElement | null>;
}

const OPEN_DELAY = 140;
const CLOSE_DELAY = 220;

/**
 * Split text into word spans (keeping inline markup) so each word can fall
 * in on its own, like drops. Spaces stay real text nodes for wrapping and
 * for screen readers, which read the sentence normally.
 */
function rain(node: ReactNode, counter: { i: number }): ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).split(/(\s+)/).map((part, k) =>
      /^\s+$/.test(part) || part === ''
        ? part
        : <span key={k} className={styles.word} style={{ '--i': counter.i++ } as React.CSSProperties}>{part}</span>
    );
  }
  if (Array.isArray(node)) return Children.map(node, (child) => rain(child, counter));
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return el.props.children === undefined ? el : cloneElement(el, undefined, rain(el.props.children, counter));
  }
  return node;
}

/**
 * Help that stays out of the way: a small drop beside the title. Hover or
 * focus shows it, a tap pins it (touch), Escape or a tap elsewhere puts it
 * away. The text stays in the DOM and is wired with aria-describedby.
 */
export function HintTip({ children, label, hoverZone }: HintTipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [round, setRound] = useState(0); // restarts the word animation on each opening
  const timer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const openRef = useRef(false);

  const clear = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; };
  /** Only ever called from events and timers, never during render. */
  const setVisible = useCallback((visible: boolean) => {
    if (visible && !openRef.current) setRound((r) => r + 1);
    openRef.current = visible;
    setOpen(visible);
    if (!visible) setPinned(false);
  }, []);
  const show = useCallback((delay = OPEN_DELAY) => {
    clear();
    timer.current = window.setTimeout(() => setVisible(true), delay);
  }, [setVisible]);
  const hide = useCallback((delay = CLOSE_DELAY) => {
    clear();
    timer.current = window.setTimeout(() => setVisible(false), delay);
  }, [setVisible]);

  // Hovering the zone (header) or the tip itself keeps it open; mouse only,
  // so a tap on touch screens doesn't open-then-close.
  useEffect(() => {
    const zones = [wrapRef.current, hoverZone?.current].filter(Boolean) as HTMLElement[];
    const enter = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') show(); };
    const leave = (e: PointerEvent) => { if ((e.pointerType === 'mouse' || e.pointerType === 'pen') && !pinned) hide(); };
    zones.forEach((z) => { z.addEventListener('pointerenter', enter); z.addEventListener('pointerleave', leave); });
    return () => zones.forEach((z) => { z.removeEventListener('pointerenter', enter); z.removeEventListener('pointerleave', leave); });
  }, [hoverZone, show, hide, pinned]);

  // Escape and taps outside put it away.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { clear(); setVisible(false); } };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current?.contains(e.target as Node) || hoverZone?.current?.contains(e.target as Node)) return;
      clear(); setVisible(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open, hoverZone, setVisible]);

  useEffect(() => clear, []);

  const counter = { i: 0 };
  return (
    <span ref={wrapRef} className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        data-open={open || undefined}
        onFocus={() => show(0)}
        onBlur={() => { if (!pinned) hide(0); }}
        onClick={() => {
          clear();
          if (pinned) { setVisible(false); return; }
          setVisible(true);
          setPinned(true);
        }}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.icon}>
          <path d="M8 1.5c2.6 3.4 4.5 6 4.5 8.4a4.5 4.5 0 0 1-9 0C3.5 7.5 5.4 4.9 8 1.5Z" />
        </svg>
      </button>
      <span id={id} role="tooltip" className={styles.tip} data-open={open || undefined}>
        <span key={round} className={styles.text}>{rain(children, counter)}</span>
      </span>
    </span>
  );
}
