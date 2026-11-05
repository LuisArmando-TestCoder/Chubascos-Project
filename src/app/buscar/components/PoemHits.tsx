import Link from 'next/link';
import { Fragment } from 'react';
import { DropSigil } from '@/components/atoms/DropSigil/DropSigil';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import type { PoemHit } from '@/actions/data';
import type { Tag } from '@/types';
import styles from '../buscar.module.scss';
import { WaterText } from '@/components/organisms/WaterText/WaterText';

interface PoemHitsProps {
  query: string;
  loading: boolean;
  result: { hits: PoemHit[]; total: number } | null;
  tagMap: Record<string, Tag>;
  matchingTags: Tag[];
  onSelectTag: (tagId: string, origin: Element) => void;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Wrap every (accent-insensitive) occurrence of the query tokens in <mark>. */
function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = fold(query).split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return <>{text}</>;
  const folded = fold(text);
  const marks: Array<[number, number]> = [];
  tokens.forEach((t) => {
    let i = folded.indexOf(t);
    while (i >= 0) { marks.push([i, i + t.length]); i = folded.indexOf(t, i + t.length); }
  });
  marks.sort((a, b) => a[0] - b[0]);
  const out: React.ReactNode[] = [];
  let at = 0;
  marks.forEach(([s, e], k) => {
    if (s < at) return;
    out.push(<Fragment key={`t${k}`}>{text.slice(at, s)}</Fragment>);
    out.push(<mark key={`m${k}`} className={styles.mark}>{text.slice(s, e)}</mark>);
    at = e;
  });
  out.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return <>{out}</>;
}

export function PoemHits({ query, loading, result, tagMap, matchingTags, onSelectTag }: PoemHitsProps) {
  return (
    <section className={styles.poemSection} aria-labelledby="poem-hits-heading" aria-busy={loading}>
      {matchingTags.length > 0 && (
        <div className={styles.matchingTags}>
          <span className={styles.subheadInline}>Etiquetas</span>
          {matchingTags.map((t) => (
            <button key={t.id} type="button" className={styles.quickTag} onClick={(e) => onSelectTag(t.id, e.currentTarget)}>
              #{t.value}
            </button>
          ))}
        </div>
      )}

      <h2 id="poem-hits-heading" className={styles.subhead}>
        <WaterText text="Dentro de los poemas" inline />
        {result && <span className={styles.subheadCount}>{result.total}</span>}
      </h2>

      {!result && loading && <p className={styles.loading}>Buscando entre los charcos…</p>}

      {result && result.hits.length === 0 && !loading && (
        <p className={styles.hint}>
          Ningún verso guarda “{query.trim()}”. Prueba otra palabra, o una etiqueta.
        </p>
      )}

      {result && result.hits.length > 0 && (
        <ol className={`${styles.hits} ${loading ? styles.panelLoading : ''}`}>
          {result.hits.map((hit) => (
            <li key={hit.id} className={styles.hit} data-drop="puddle">
              <DropSigil seed={hit.id} text={hit.content} size={48} className={styles.hitSigil} />
              <div className={styles.hitBody}>
                <h3 className={styles.hitTitle}>
                  <Link href={`/u/${hit.userId}/p/${hit.slug}`} className={styles.hitLink}>
                    <WaterText text={hit.title} />
                  </Link>
                </h3>
                {hit.snippet && (
                  <blockquote className={styles.hitSnippet}>
                    <Highlight text={hit.snippet} query={query} />
                  </blockquote>
                )}
                <div className={styles.hitMeta}>
                  <Link href={`/u/${hit.userId}`} className={styles.hitAuthor}>
                    <WaterText text={hit.authorName} inline />
                  </Link>
                  <span className={styles.hitDate}>{formatDate(hit.updatedAt)}</span>
                  {(hit.tagIds || []).slice(0, 3).map((id) => tagMap[id]).filter(Boolean).map((t) => (
                    <TagPill key={t!.id} value={t!.value} tagId={t!.id} size="sm" />
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
