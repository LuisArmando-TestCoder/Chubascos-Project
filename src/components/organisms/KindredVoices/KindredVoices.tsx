import Link from 'next/link';
import { DropSigil } from '@/components/atoms/DropSigil/DropSigil';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import type { Kindred } from '@/lib/affinity';
import styles from './KindredVoices.module.scss';
import { profilePath } from '@/lib/handles';

interface KindredVoicesProps {
  voices: Kindred[];
  /** "Escriben parecido a ti" on your own dashboard; the poet's name elsewhere. */
  title?: string;
  /** Compact list for narrow rails. */
  compact?: boolean;
}

/**
 * Voices whose tags fall close to this author's, with the tags that bring
 * them together. Each tag links to its search, so the list is also a way in.
 */
export function KindredVoices({ voices, title = 'Voces afines', compact = false }: KindredVoicesProps) {
  if (voices.length === 0) return null;
  return (
    <section className={`${styles.root} ${compact ? styles.compact : ''}`} aria-labelledby="voces-afines">
      <h2 id="voces-afines" className={styles.title}><WaterText text={title} /></h2>
      <p className={styles.lede}>Escriben cerca: sus etiquetas caen en las mismas ramas.</p>
      <ol className={styles.list}>
        {voices.map((v) => {
          const pct = Math.round(v.score * 100);
          return (
            <li key={v.id} className={styles.item} data-drop="rain">
              <div className={styles.sigil} aria-hidden="true">
                <DropSigil name={v.name} size="100%" glyph={v.name.slice(0, 1).toUpperCase()} />
              </div>
              <div className={styles.body}>
                <h3 className={styles.name}>
                  <Link href={profilePath(v)} className={styles.link}><WaterText text={v.name} /></Link>
                </h3>
                {v.shared.length > 0 && (
                  <p className={styles.shared}>
                    <span className={styles.sharedLabel}>Comparten</span>{' '}
                    {v.shared.map((s, i) => (
                      <span key={s.slug}>
                        {i > 0 && <span className={styles.sep} aria-hidden="true"> · </span>}
                        {s.tagId ? (
                          <Link href={`/buscar?tag=${s.tagId}`} className={styles.tag} data-drop="puddle">{s.label}</Link>
                        ) : (
                          <span className={styles.tag}>{s.label}</span>
                        )}
                      </span>
                    ))}
                  </p>
                )}
              </div>
              {/* A rain column: how much of the same weather they share. */}
              <div className={styles.meter} role="img" aria-label={`Afinidad ${pct}%`}>
                <span className={styles.fill} style={{ ['--a' as string]: Math.min(1, v.score / 0.6) }} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
