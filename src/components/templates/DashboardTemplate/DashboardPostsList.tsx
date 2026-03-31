'use client';
import Link from 'next/link';
import type { Post } from '@/types';
import styles from './DashboardPostsList.module.scss';

interface DashboardPostsListProps {
  posts: Post[];
  activePostId?: string | null;
}

export function DashboardPostsList({ posts, activePostId }: DashboardPostsListProps) {
  if (posts.length === 0) return null;

  return (
    <div className={styles.container}>
      <p className={styles.heading}>mis poemas</p>
      <ul className={styles.list}>
        {posts.map((post, index) => {
          const isActive = post.id === activePostId;
          return (
            <li key={post.id} className={`${styles.item} ${isActive ? styles.itemActive : ''} ${!post.isVisible ? styles.itemHidden : ''}`}>
              <Link
                href={`/dashboard?edit=post&id=${post.id}`}
                className={styles.link}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.title}>{post.title}</span>
                <span className={styles.meta}>
                  {!post.isVisible && <span className={styles.badge}>oculto</span>}
                  <span className={styles.arrow}>→</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
