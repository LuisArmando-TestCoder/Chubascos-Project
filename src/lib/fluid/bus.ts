/**
 * Fluid interaction bus.
 *
 * UI code never talks to the GPU. It only describes what happened
 * ("a drop fell here", "the page was dragged up") and the active renderer
 * (WebGPU fluid or the 2D ripple fallback) decides how to show it.
 * Coordinates are CSS pixels relative to the viewport.
 */

export type FluidTone = 'rain' | 'puddle' | 'paper' | 'ember';

export type Splat = {
  x: number;
  y: number;
  /** velocity impulse in CSS px per second */
  dx: number;
  dy: number;
  /** radius in CSS px */
  radius?: number;
  tone?: FluidTone;
  /** dye amount multiplier, 0..2 */
  strength?: number;
};

type Listener = (s: Splat) => void;
type ForceListener = (fx: number, fy: number) => void;

const splatListeners = new Set<Listener>();
const forceListeners = new Set<ForceListener>();

export function onSplat(fn: Listener): () => void {
  splatListeners.add(fn);
  return () => splatListeners.delete(fn);
}

export function onForce(fn: ForceListener): () => void {
  forceListeners.add(fn);
  return () => forceListeners.delete(fn);
}

export function splat(s: Splat): void {
  splatListeners.forEach((fn) => fn(s));
}

/** Uniform body force over the whole surface (e.g. scroll drag), px/s. */
export function force(fx: number, fy: number): void {
  forceListeners.forEach((fn) => fn(fx, fy));
}

/** A raindrop impact: a ring of outward impulses around a point. */
export function drop(x: number, y: number, opts: { tone?: FluidTone; power?: number; radius?: number } = {}): void {
  const power = opts.power ?? 1;
  const r = opts.radius ?? 18;
  const arms = 6;
  const phase = Math.random() * Math.PI;
  for (let i = 0; i < arms; i++) {
    const a = phase + (i / arms) * Math.PI * 2;
    splat({
      x: x + Math.cos(a) * r * 0.6,
      y: y + Math.sin(a) * r * 0.6,
      dx: Math.cos(a) * 520 * power,
      dy: Math.sin(a) * 520 * power,
      radius: r,
      tone: opts.tone,
      strength: 0.55 * power,
    });
  }
}

/** Drop at the centre of an element (or at a point inside it). */
export function dropAt(el: Element | null, opts: { tone?: FluidTone; power?: number; at?: 'center' | 'random' } = {}): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const x = opts.at === 'random' ? r.left + Math.random() * r.width : r.left + r.width / 2;
  const y = opts.at === 'random' ? r.top + Math.random() * r.height : r.top + r.height / 2;
  drop(x, y, { tone: opts.tone, power: opts.power, radius: Math.min(40, Math.max(12, r.height / 3)) });
}

/** A rising plume (save, publish, follow). */
export function plume(el: Element | null, tone: FluidTone = 'puddle'): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 4; i++) {
    splat({
      x: r.left + r.width * (0.2 + 0.2 * i),
      y: r.top,
      dx: (Math.random() - 0.5) * 160,
      dy: -900,
      radius: 22,
      tone,
      strength: 0.7,
    });
  }
}

/** Deterministic tone for a string (a tag, a user) so identity has a colour. */
export function toneFor(seed: string): FluidTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const tones: FluidTone[] = ['rain', 'puddle', 'paper', 'rain'];
  return tones[Math.abs(h) % tones.length];
}
