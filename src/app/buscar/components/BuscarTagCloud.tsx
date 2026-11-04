import React from 'react';
import styles from '../buscar.module.scss';
import type { Tag } from '@/types';

interface BuscarTagCloudProps {
  tags: Tag[];
  selectedTag: string;
  loading: boolean;
  onSelectTag: (tagId: string, origin: Element) => void;
}

const totalOf = (t: Tag) => (t.usedByPosts || 0) + (t.usedByEvents || 0) + (t.usedByBooks || 0);

/** Tags as drops of different weight: more work beneath a tag, a heavier drop. */
export function BuscarTagCloud({ tags, selectedTag, loading, onSelectTag }: BuscarTagCloudProps) {
  if (tags.length === 0) return <p className={styles.hint}>Todavía no hay etiquetas con obra.</p>;
  const max = Math.max(...tags.map(totalOf), 1);
  const sorted = [...tags].sort((a, b) => a.slug.localeCompare(b.slug));

  return (
    <ul className={styles.tagCloud}>
      {sorted.map((tag) => {
        const isSelected = selectedTag === tag.id;
        const total = totalOf(tag);
        const weight = Math.log(1 + total) / Math.log(1 + max); // 0..1
        return (
          <li key={tag.id}>
            <button
              type="button"
              className={`${styles.tagBtn} ${isSelected ? styles.active : ''}`}
              style={{ ['--w' as string]: weight.toFixed(3) }}
              onClick={(e) => onSelectTag(tag.id, e.currentTarget)}
              aria-pressed={isSelected}
              aria-label={`${tag.value}, ${total} ${total === 1 ? 'obra' : 'obras'}`}
            >
              <span className={styles.tagHash} aria-hidden="true">#</span>
              <span className={styles.tagValue}>{tag.value}</span>
              {isSelected && loading
                ? <span className={styles.tagSpinner} aria-hidden="true" />
                : <span className={styles.tagCount} aria-hidden="true">{total}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
