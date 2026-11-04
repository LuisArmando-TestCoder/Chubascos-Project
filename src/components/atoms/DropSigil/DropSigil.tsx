/**
 * DropSigil: the puddle a piece of writing leaves behind.
 *
 * A deterministic, procedural ring glyph. Its geometry comes from the work
 * itself: the number of rings follows the number of lines, the gaps between
 * rings follow line lengths (the poem's breathing), and the wobble is seeded
 * by the id. The same poem always leaves the same puddle, on the server and
 * on the client (no hydration drift).
 */
import { memo } from 'react';
import styles from './DropSigil.module.scss';

interface DropSigilProps {
  seed: string;
  /** The text the puddle is made of (poem, bio, description). Optional. */
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

const r2 = (n: number) => Math.round(n * 100) / 100;

export function sigilGeometry(seed: string, text = '', wobble = 1) {
  const rand = rng(hash32(seed));
  const lines = text
    .replace(/[#*`_~>[\]()]/g, '')
    .split(/\n/)
    .map((l) => l.trim().length)
    .filter((n) => n > 0);

  const ringCount = lines.length
    ? Math.max(3, Math.min(8, Math.round(Math.sqrt(lines.length)) + 2))
    : 3 + Math.floor(rand() * 3);

  // Gap weights: average line length per group of lines, else random rhythm.
  const weights: number[] = [];
  for (let i = 0; i < ringCount; i++) {
    if (lines.length) {
      const a = Math.floor((i / ringCount) * lines.length);
      const b = Math.max(a + 1, Math.floor(((i + 1) / ringCount) * lines.length));
      const group = lines.slice(a, b);
      const avg = group.reduce((s, n) => s + n, 0) / group.length;
      weights.push(0.6 + Math.min(avg, 80) / 80);
    } else {
      weights.push(0.6 + rand());
    }
  }
  const total = weights.reduce((s, n) => s + n, 0);

  const cx = 50 + (rand() - 0.5) * 6;
  const cy = 50 + (rand() - 0.5) * 6;
  const inner = 5;
  const outer = 46;
  const rings: { d: string; i: number }[] = [];
  let acc = 0;
  for (let i = 0; i < ringCount; i++) {
    acc += weights[i];
    const R = inner + (acc / total) * (outer - inner);
    const harmonics = [2, 3, 5].map((k) => ({
      k,
      amp: (0.25 + rand() * 0.9) * wobble * (R / outer),
      ph: rand() * Math.PI * 2,
    }));
    const steps = 56;
    let d = '';
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2;
      const r = R + harmonics.reduce((sum, h) => sum + h.amp * Math.sin(h.k * t + h.ph), 0);
      const x = cx + Math.cos(t) * r;
      const y = cy + Math.sin(t) * r;
      d += `${s === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)}`;
    }
    rings.push({ d: d + 'Z', i });
  }
  return { cx: r2(cx), cy: r2(cy), rings, streak: rand() > 0.55 };
}

function DropSigilBase({ seed, text, size = 64, className = '', glyph, wobble = 1, eye = true }: DropSigilProps) {
  const g = sigilGeometry(seed, text, wobble);
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
      {g.rings.map((ring) => (
        <path
          key={ring.i}
          d={ring.d}
          pathLength={1}
          className={styles.ring}
          style={{
            ['--i' as string]: ring.i,
            strokeOpacity: 0.95 - (ring.i / n) * 0.65,
            strokeWidth: 1.1 - (ring.i / n) * 0.55,
            ...(g.streak && ring.i === n - 2 ? { strokeDasharray: '0.015 0.025' } : null),
          }}
        />
      ))}
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
