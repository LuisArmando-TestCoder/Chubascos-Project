import React from 'react';
import styles from '../buscar.module.scss';
import type { Tag, User } from '@/types';

interface BuscarTagCloudProps {
  tags: Tag[];
  tagMap: Record<string, Tag>;
  selectedTag: string;
  users: User[];
  loading: boolean;
  onSelectTag: (tagId: string) => void;
}

export function BuscarTagCloud({
  tags,
  tagMap,
  selectedTag,
  users,
  loading,
  onSelectTag
}: BuscarTagCloudProps) {
  const mergedTags = Array.from(
    new Map([...tags, ...Object.values(tagMap)].map(t => [t.id, t])).values()
  );

  const visibleTags = mergedTags
    .filter(tag => ((tag.usedByPosts || 0) + (tag.usedByEvents || 0) + (tag.usedByBooks || 0)) > 0 || tag.id === selectedTag)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  if (visibleTags.length === 0) return null;

  return (
    <div className={styles.tagCloud}>
      {visibleTags.map((tag) => {
        const isSelected = selectedTag === tag.id;
        const totalCount = (tag.usedByPosts || 0) + (tag.usedByEvents || 0) + (tag.usedByBooks || 0) + (isSelected ? users.length : 0);
        return (
          <button
            key={tag.id}
            className={`${styles.tagBtn} ${isSelected ? styles.active : ''}`}
            onClick={() => onSelectTag(tag.id)}
            aria-pressed={isSelected}
          >
            #{tag.value}
            {isSelected && loading && <span className={styles.tagSpinner} aria-hidden="true" />}
            {/* Always show the count, not just when selected (as per user request) */}
            {(!isSelected || !loading) && <span className={styles.tagCount}>{totalCount}</span>}
          </button>
        );
      })}
    </div>
  );
}
