'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { SectionHeader } from '@/components/molecules/SectionHeader/SectionHeader';
import i18n from '@/utils/i18n';
import type { Event, Tag } from '@/types';
import styles from './HomeTemplate.module.scss';

interface EventsSectionProps {
  events: Event[];
  tagMap?: Record<string, Tag>;
}

const DRIFT_PX_PER_S = 28;

/**
 * Upcoming events as a slow current: the row drifts on its own, stops when
 * you reach for it, and the mouse wheel scrolls it sideways while hovered.
 * At either end the wheel hands control back to the page (no scroll trap).
 */
export function EventsSection({ events, tagMap = {} }: EventsSectionProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [loop, setLoop] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Loop (duplicate the row) only when it actually overflows.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const check = () => setLoop(track.scrollWidth / (loop ? 2 : 1) > track.clientWidth + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(track);
    return () => ro.disconnect();
  }, [loop, events.length]);

  // Auto drift (skipped for reduced motion, off-screen and hidden tabs).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !loop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    let pos = track.scrollLeft;
    let inView = false;
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; });
    io.observe(track);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (inView && !pausedRef.current && document.visibilityState === 'visible') {
        const half = track.scrollWidth / 2;
        // Sync with manual scrolling, then drift forward and wrap seamlessly.
        if (Math.abs(track.scrollLeft - Math.round(pos)) > 2) pos = track.scrollLeft;
        pos += DRIFT_PX_PER_S * dt;
        if (pos >= half) pos -= half;
        track.scrollLeft = pos;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [loop]);

  // Hover + vertical wheel → horizontal scroll, released at the edges.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      const max = track.scrollWidth - track.clientWidth;
      const atStart = track.scrollLeft <= 0 && delta < 0;
      const atEnd = track.scrollLeft >= max - 1 && delta > 0;
      if (loop && track.scrollLeft + delta >= track.scrollWidth / 2) {
        track.scrollLeft -= track.scrollWidth / 2; // keep the loop endless
      } else if (loop && track.scrollLeft + delta < 0) {
        track.scrollLeft += track.scrollWidth / 2;
      } else if (atStart || atEnd) {
        return;
      }
      e.preventDefault();
      track.scrollLeft += delta;
    };
    track.addEventListener('wheel', onWheel, { passive: false });
    return () => track.removeEventListener('wheel', onWheel);
  }, [loop]);

  const step = useCallback((dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector('li');
    const amount = (card?.getBoundingClientRect().width ?? 320) + 20;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }, []);

  if (events.length === 0) return null;

  const renderCards = (clone: boolean) =>
    events.map((event) => (
      <li key={`${clone ? 'c' : 'o'}-${event.id}`} className={styles.slide} aria-hidden={clone || undefined} inert={clone || undefined}>
        <EventCard event={event} tags={(event.tagIds || []).map((id) => tagMap[id]).filter(Boolean) as Tag[]} />
      </li>
    ));

  return (
    <section className={styles.section} aria-labelledby="events-heading">
      <div className={styles.sectionInner}>
        <SectionHeader
          id="events-heading"
          title={i18n.home.events.title}
          echo="encuentros"
          aside={
            <div className={styles.sliderControls}>
              <button type="button" className={styles.sliderBtn} onClick={() => step(-1)} aria-label="Eventos anteriores" aria-controls="eventos-slider">←</button>
              <button type="button" className={styles.sliderBtn} onClick={() => step(1)} aria-label="Eventos siguientes" aria-controls="eventos-slider">→</button>
            </div>
          }
        />
      </div>

      <div
        id="eventos-slider"
        ref={trackRef}
        className={styles.slider}
        role="region"
        aria-label="Próximos encuentros, desplazable horizontalmente"
        tabIndex={0}
        data-lenis-prevent-wheel
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        }}
      >
        <ul className={styles.slides}>
          {renderCards(false)}
          {loop && renderCards(true)}
        </ul>
      </div>

      <div className={styles.sectionInner}>
        <div className={styles.sectionCta}>
          <Link href="/buscar?type=events" className={styles.ctaBtn}>
            {i18n.common.seeMore}
          </Link>
        </div>
      </div>
    </section>
  );
}
