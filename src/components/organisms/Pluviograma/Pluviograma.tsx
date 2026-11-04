import Link from 'next/link';
import type { Post } from '@/types';
import styles from './Pluviograma.module.scss';

interface PluviogramaProps {
  posts: Post[];
}

type Ts = { seconds: number } | null | undefined;
const secondsOf = (ts: unknown) => (ts && typeof ts === 'object' && 'seconds' in ts ? (ts as { seconds: number }).seconds : 0);

function hashUnit(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

const fmt = (s: number, opts: Intl.DateTimeFormatOptions) => new Date(s * 1000).toLocaleDateString('es-CR', opts);

/**
 * The visual history: every recent poem placed on a time axis where it fell.
 * Ring size = number of verses. Each drop is a real link, in reading order.
 */
export function Pluviograma({ posts }: PluviogramaProps) {
  const items = posts
    .map((p) => ({ p, s: secondsOf(p.updatedAt as Ts) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => a.s - b.s);
  if (items.length < 2) return null;

  const min = items[0].s;
  const max = items[items.length - 1].s;
  const span = Math.max(1, max - min);
  const ticks = 5;

  return (
    <figure className={styles.figure} aria-labelledby="pluviograma-caption">
      <div className={styles.chart}>
        <div className={styles.baseline} aria-hidden="true" />
        <ol className={styles.drops}>
          {items.map(({ p, s }, i) => {
            const verses = p.content.split('\n').filter((l) => l.trim()).length;
            const x = 3 + ((s - min) / span) * 94;
            const lift = 18 + hashUnit(p.id) * 52;
            const size = Math.round(14 + Math.min(46, Math.sqrt(verses) * 7));
            return (
              <li
                key={p.id}
                className={styles.drop}
                style={{ left: `${x}%`, ['--lift' as string]: `${lift}%`, ['--size' as string]: `${size}px`, ['--i' as string]: i }}
              >
                <Link href={`/u/${p.userId}/p/${p.slug}`} className={styles.link} data-drop="rain">
                  <span className={styles.streak} aria-hidden="true" />
                  <span className={styles.ring} aria-hidden="true" />
                  <span className={styles.tip}>
                    <span className={styles.tipTitle}>{p.title}</span>
                    <span className={styles.tipMeta}>{fmt(s, { day: 'numeric', month: 'short' })} · {verses} versos</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <div className={styles.axis} aria-hidden="true">
          {Array.from({ length: ticks }, (_, k) => (
            <span key={k} className={styles.tick} style={{ left: `${3 + (k / (ticks - 1)) * 94}%` }}>
              {fmt(min + (span * k) / (ticks - 1), { day: 'numeric', month: 'short' })}
            </span>
          ))}
        </div>
      </div>
      <figcaption id="pluviograma-caption" className={styles.caption}>
        Pluviograma · {items.length} lluvias entre el {fmt(min, { day: 'numeric', month: 'long' })} y el {fmt(max, { day: 'numeric', month: 'long', year: 'numeric' })}.
        Cada anillo es un poema; su tamaño, sus versos.
      </figcaption>
    </figure>
  );
}
