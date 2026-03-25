'use client';
import Link from 'next/link';
import styles from './TagPill.module.scss';

interface TagPillProps {
  value: string;
  tagId?: string;
  size?: 'sm' | 'md';
  interactive?: boolean;
}

export function TagPill({ value, tagId, size = 'md', interactive = true }: TagPillProps) {
  const className = `${styles.pill} ${styles[size]}`;
  if (interactive && tagId) {
    return (
      <Link href={`/buscar?tag=${tagId}`} className={className}>
        #{value}
      </Link>
    );
  }
  return <span className={className}>#{value}</span>;
}
