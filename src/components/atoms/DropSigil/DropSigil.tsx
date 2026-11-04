/**
 * DropSigil: the puddle a voice leaves behind.
 *
 * Two deterministic modes, same output on the server and in the browser:
 *  - `name`: fully generative from SHA-256(name). Each of the 32 digest bytes
 *    drives one decision (ring count, spacing, harmonics, phase, dashes,
 *    satellites, rotation), so every poet gets a distinct, stable mark.
 *  - `seed` + `text`: rings follow the text's lines (used for search hits).
 */
import { memo } from 'react';
import { sha256 } from '@/utils/sha256';
import styles from './DropSigil.module.scss';

interface DropSigilProps {
  /** Generate from SHA-256 of this name (preferred for people). */
  name?: string;
  seed?: string;
  /** Text whose lines shape the rings (seed mode only). */
  text?: string;
  size?: number | string;
  className?: string;
  /** Show a glyph (e.g. an initial) in the eye of the puddle. */
  glyph?: string;
  /** Scale of ring wobble, 0 = perfect circles. */
  wobble?: number;
  /** Draw the drop at the centre (off when something else sits there). */
  eye?: boolean;
}

type Ring = { d: string; i: number; dash?: string };
type Geometry = { cx: number; cy: number; rings: Ring[]; satellites: { x: number; y: number; r: number }[]; rotate: number };

const r2 = (n: number) => Math.round(n * 100) / 100;
const TAU = Math.PI * 2;

function ringPath(cx: number, cy: number, R: number, harmonics: { k: number; amp: number; ph: number }[]): string {
  const steps = 72;
  let d = '';
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * TAU;
    const r = R + harmonics.reduce((sum, h) => sum + h.amp * Math.sin(h.k * t + h.ph), 0);
    d += `${s === 0 ? 'M' : 'L'}${r2(cx + Math.cos(t) * r)} ${r2(cy + Math.sin(t) * r)}`;
  }
  return d + 'Z';
}

/** Every choice below reads one byte of the digest: the name *is* the drawing. */
function fromName(name: string, wobble: number): Geometry {
  const b = sha256(name.trim().toLowerCase());
  const u = (i: number) => b[i % 32] / 255; // 0..1
  const ringCount = 4 + (b[0] % 5);
  const cx = 50 + (u(2) - 0.5) * 5;
  const cy = 50 + (u(3) - 0.5) * 5;
  const weights = Array.from({ length: ringCount }, (_, i) => 0.45 + u(4 + i) * 1.1);
  const total = weights.reduce((s, w) => s + w, 0);
  const inner = 7;
  const outer = 47;

  const rings: Ring[] = [];
  let acc = 0;
  for (let i = 0; i < ringCount; i++) {
    acc += weights[i];
    const R = inner + (acc / total) * (outer - inner);
    const k1 = 2 + (b[12 + i] % 5);
    const k2 = k1 + 1 + (b[13 + i] % 3);
    const harmonics = [
      { k: k1, amp: (0.3 + u(20 + i) * 1.6) * wobble * (R / outer), ph: u(5 + i * 3) * TAU },
      { k: k2, amp: (0.1 + u(21 + i) * 0.7) * wobble * (R / outer), ph: u(6 + i * 3) * TAU },
    ];
    const dashed = (b[28] >> i) & 1 && i > 0 && i < ringCount - 1;
    const dashLen = 0.006 + u(30) * 0.02;
    rings.push({
      d: ringPath(cx, cy, R, harmonics),
      i,
      dash: dashed ? `${r2(dashLen)} ${r2(dashLen * (1 + u(31 + i) * 2))}` : undefined,
    });
  }

  // 1–3 satellite drops resting on rings, like rain caught mid-fall.
  const satellites = Array.from({ length: 1 + (b[29] % 3) }, (_, k) => {
    const ring = 1 + (b[16 + k] % (ringCount - 1));
    const R = inner + (weights.slice(0, ring + 1).reduce((s, w) => s + w, 0) / total) * (outer - inner);
    const a = u(24 + k) * TAU;
    return { x: r2(cx + Math.cos(a) * R), y: r2(cy + Math.sin(a) * R), r: r2(0.9 + u(27 + k) * 1.4) };
  });

  return { cx: r2(cx), cy: r2(cy), rings, satellites, rotate: Math.round(u(1) * 360) };
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Text mode: ring count follows lines, gaps follow line lengths. */
function fromText(seed: string, text = '', wobble = 1): Geometry {
  const rand = rng(hash32(seed));
  const lines = text
    .replace(/[#*`_~>[\]()]/g, '')
    .split(/\n/)
    .map((l) => l.trim().length)
    .filter((n) => n > 0);
  const ringCount = lines.length
    ? Math.max(3, Math.min(8, Math.round(Math.sqrt(lines.length)) + 2))
    : 3 + Math.floor(rand() * 3);
  const weights: number[] = [];
  for (let i = 0; i < ringCount; i++) {
    if (lines.length) {
      const a = Math.floor((i / ringCount) * lines.length);
      const z = Math.max(a + 1, Math.floor(((i + 1) / ringCount) * lines.length));
      const group = lines.slice(a, z);
      weights.push(0.6 + Math.min(group.reduce((s, n) => s + n, 0) / group.length, 80) / 80);
    } else {
      weights.push(0.6 + rand());
    }
  }
  const total = weights.reduce((s, n) => s + n, 0);
  const cx = 50 + (rand() - 0.5) * 6;
  const cy = 50 + (rand() - 0.5) * 6;
  const rings: Ring[] = [];
  let acc = 0;
  for (let i = 0; i < ringCount; i++) {
    acc += weights[i];
    const R = 5 + (acc / total) * 41;
    const harmonics = [2, 3, 5].map((k) => ({ k, amp: (0.25 + rand() * 0.9) * wobble * (R / 46), ph: rand() * TAU }));
    rings.push({ d: ringPath(cx, cy, R, harmonics), i });
  }
  return { cx: r2(cx), cy: r2(cy), rings, satellites: [], rotate: 0 };
}

function DropSigilBase({ name, seed = '', text, size = 64, className = '', glyph, wobble = 1, eye = true }: DropSigilProps) {
  const g = name ? fromName(name, wobble) : fromText(seed, text, wobble);
  const n = g.rings.length;
  return (
    <svg
      className={`${styles.sigil} ${className}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={g.rotate ? `rotate(${g.rotate} 50 50)` : undefined}>
        {g.rings.map((ring) => (
          <path
            key={ring.i}
            d={ring.d}
            pathLength={1}
            className={`${styles.ring} ${ring.dash ? styles.dashed : ''}`}
            style={{
              ['--i' as string]: ring.i,
              strokeOpacity: 0.95 - (ring.i / n) * 0.6,
              strokeWidth: 1.15 - (ring.i / n) * 0.55,
              ...(ring.dash ? { strokeDasharray: ring.dash } : null),
            }}
          />
        ))}
        {g.satellites.map((s, k) => (
          <circle key={k} cx={s.x} cy={s.y} r={s.r} className={styles.satellite} />
        ))}
      </g>
      {glyph ? (
        <text x={g.cx} y={g.cy} className={styles.glyph} textAnchor="middle" dominantBaseline="central">
          {glyph}
        </text>
      ) : eye ? (
        <circle cx={g.cx} cy={g.cy} r={2.4} className={styles.eye} />
      ) : null}
    </svg>
  );
}

export const DropSigil = memo(DropSigilBase);
