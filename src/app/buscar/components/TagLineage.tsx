import { pathTo, TAXON_INDEX } from '@/data/tagTaxonomy';
import type { Tag } from '@/types';
import styles from '../buscar.module.scss';

interface TagLineageProps {
  tag: Tag;
  tags: Tag[];
  /** How many tags of the branch were searched together. */
  scopeSize: number;
  onSelect: (tagId: string, origin: Element) => void;
}

/** Where this tag lives: its ancestry, what grows beneath it, and its neighbours. */
export function TagLineage({ tag, tags, scopeSize, onSelect }: TagLineageProps) {
  const bySlug = new Map(tags.map((t) => [t.slug, t]));
  const path = pathTo(tag.slug);
  if (path.length === 0) return null;
  const node = path[path.length - 1];
  const parentSlug = TAXON_INDEX.parentOf.get(node.slug);
  const parent = parentSlug ? TAXON_INDEX.bySlug.get(parentSlug) : undefined;
  const siblings = (parent?.children ?? []).filter((n) => n.slug !== node.slug);

  const chip = (slug: string, label: string) => {
    const t = bySlug.get(slug);
    if (!t) return null;
    return (
      <li key={slug}>
        <button type="button" className={styles.lineageChip} onClick={(e) => onSelect(t.id, e.currentTarget)}>
          {label}
        </button>
      </li>
    );
  };

  return (
    <div className={styles.lineage}>
      <nav aria-label="Linaje de la etiqueta" className={styles.lineagePath}>
        {path.map((n, i) => {
          const t = bySlug.get(n.slug);
          const last = i === path.length - 1;
          return (
            <span key={n.slug} className={styles.lineageStep}>
              {i > 0 && <span aria-hidden="true" className={styles.lineageSep}>›</span>}
              {n.root || last || !t ? (
                <span aria-current={last ? 'page' : undefined} className={last ? styles.lineageHere : undefined}>{n.label}</span>
              ) : (
                <button type="button" className={styles.lineageLink} onClick={(e) => onSelect(t.id, e.currentTarget)}>{n.label}</button>
              )}
            </span>
          );
        })}
      </nav>

      {node.gloss && <p className={styles.lineageGloss}>{node.gloss}</p>}
      {scopeSize > 1 && (
        <p className={styles.lineageNote}>Incluye lo escrito en {scopeSize - 1} {scopeSize - 1 === 1 ? 'etiqueta' : 'etiquetas'} de esta rama.</p>
      )}

      {node.children.length > 0 && (
        <div className={styles.lineageGroup}>
          <span className={styles.lineageLabel}>Más adentro</span>
          <ul className={styles.lineageChips}>{node.children.map((c) => chip(c.slug, c.label))}</ul>
        </div>
      )}
      {siblings.length > 0 && (
        <div className={styles.lineageGroup}>
          <span className={styles.lineageLabel}>Al lado</span>
          <ul className={styles.lineageChips}>{siblings.map((c) => chip(c.slug, c.label))}</ul>
        </div>
      )}
    </div>
  );
}
