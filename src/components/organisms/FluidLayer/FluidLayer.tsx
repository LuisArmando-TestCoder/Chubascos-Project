'use client';
/**
 * The water under every page.
 *
 * Mounts one fixed canvas behind the content and turns user interactions into
 * disturbances on it: pointer motion stirs, a press is a raindrop, scrolling
 * drags the surface. Components add their own moments through `@/lib/fluid/bus`.
 *
 * - WebGPU stable fluids when available, a 2D ripple fallback otherwise.
 * - Off entirely with `prefers-reduced-motion: reduce`.
 * - Sleeps (no rAF) after a few quiet seconds and while the tab is hidden.
 */
import { useEffect, useRef } from 'react';
import { onSplat, onForce, splat, drop, type FluidTone } from '@/lib/fluid/bus';
import type { FluidRenderer } from '@/lib/fluid/types';
import styles from './FluidLayer.module.scss';

const SLEEP_AFTER_MS = 7000;

export default function FluidLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;

    let surface: HTMLCanvasElement = canvas;
    let renderer: FluidRenderer | null = null;
    let raf = 0;
    let lastFrame = 0;
    let lastActivity = 0;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    const wake = () => {
      lastActivity = performance.now();
      if (!raf && renderer && document.visibilityState === 'visible') {
        lastFrame = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    const loop = (now: number) => {
      raf = 0;
      if (!renderer || disposed) return;
      if (renderer.isLost()) { void boot(true); return; }
      const dt = Math.min(1 / 30, (now - lastFrame) / 1000 || 1 / 60);
      lastFrame = now;
      renderer.step(dt);
      if (now - lastActivity < SLEEP_AFTER_MS) raf = requestAnimationFrame(loop);
      else renderer.step(0); // settle the last frame, then sleep
    };

    const resize = () => {
      renderer?.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
      wake();
    };

    async function boot(forceFallback = false) {
      renderer?.destroy();
      renderer = null;
      if (!forceFallback) {
        const { createGpuFluid } = await import('@/lib/fluid/gpuFluid');
        renderer = await createGpuFluid(surface).catch(() => null);
      }
      if (!renderer) {
        // A canvas that ever held a webgpu context can't switch to 2d: swap it.
        const { createRipple2d } = await import('@/lib/fluid/ripple2d');
        const fresh = surface.cloneNode() as HTMLCanvasElement;
        surface.replaceWith(fresh);
        surface = fresh;
        renderer = createRipple2d(surface);
      }
      if (disposed) { renderer?.destroy(); return; }
      if (renderer) surface.parentElement?.setAttribute('data-renderer', renderer.kind);
      resize();
    }

    cleanups.push(onSplat((s) => { renderer?.splat(s); wake(); }));
    cleanups.push(onForce((x, y) => { renderer?.force(x, y); wake(); }));

    // Pointer: stir when moving with intent, a drop on press.
    let px = -1, py = -1, pt = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (px >= 0) {
        const dt = Math.max(8, now - pt) / 1000;
        const vx = (e.clientX - px) / dt;
        const vy = (e.clientY - py) / dt;
        const speed = Math.hypot(vx, vy);
        if (speed > 120) {
          splat({ x: e.clientX, y: e.clientY, dx: vx * 0.35, dy: vy * 0.35, radius: 14, tone: 'rain', strength: Math.min(0.35, speed / 4000) });
        }
      }
      px = e.clientX; py = e.clientY; pt = now;
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drop(e.clientX, e.clientY, { tone: 'puddle', power: e.pointerType === 'touch' ? 0.7 : 0.55 });
    };
    // Scroll: the content drags the water in the opposite direction.
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - lastY;
      lastY = y;
      if (Math.abs(d) > 2) {
        renderer?.force(0, -d * 40);
        if (Math.abs(d) > 40) {
          splat({ x: Math.random() * window.innerWidth, y: d > 0 ? window.innerHeight : 0, dx: 0, dy: -d * 12, radius: 60, tone: 'rain', strength: 0.18 });
        }
        wake();
      }
    };
    // Declarative moments: any element with data-drop="<tone>" ripples when
    // the pointer or keyboard focus arrives on it.
    let lastDropEl: Element | null = null;
    const dropFrom = (target: EventTarget | null, x?: number, y?: number) => {
      const el = (target as Element | null)?.closest?.('[data-drop]') ?? null;
      if (!el || el === lastDropEl) { if (!el) lastDropEl = null; return; }
      lastDropEl = el;
      const r = el.getBoundingClientRect();
      const tone = (el.getAttribute('data-drop') || 'rain') as FluidTone;
      drop(x ?? r.left + Math.min(48, r.width / 2), y ?? r.top + r.height / 2, { tone, power: 0.35, radius: 22 });
    };
    const onOver = (e: PointerEvent) => { if (e.pointerType === 'mouse') dropFrom(e.target, e.clientX, e.clientY); };
    const onFocusIn = (e: FocusEvent) => dropFrom(e.target);

    const onVisibility = () => { if (document.visibilityState === 'visible') wake(); };
    const onMotionChange = () => { if (motion.matches) { cancelAnimationFrame(raf); raf = 0; renderer?.destroy(); renderer = null; } };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotionChange);
    cleanups.push(() => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotionChange);
    });

    // Boot after first paint so the water never competes with content for LCP.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => void boot(), { timeout: 1200 });
    else setTimeout(() => void boot(), 300);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((fn) => fn());
      renderer?.destroy();
    };
  }, []);

  return (
    <div className={styles.layer} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
