'use client';
import Link from 'next/link';
import type { Post, Book } from '@/types';
import styles from './DashboardPostsList.module.scss';

import { sanitizeMarkdown } from '@/utils/sanitizeMarkdown';

interface DashboardPostsListProps {
  items: (Post | Book)[];
  activeId?: string | null;
  type: 'post' | 'book';
  title?: string;
  isPublic?: boolean;
  isOwner?: boolean;
}

export function DashboardPostsList({ items, activeId, type, title, isPublic = false, isOwner = false }: DashboardPostsListProps) {
  if (items.length === 0) return null;

  const heading = title || (type === 'post' ? 'mis poemas' : 'mis libros');

  return (
    <div className={`${styles.container} ${isPublic ? styles.public : ''}`}>
      <p className={styles.heading}>{heading}</p>
      <ul className={styles.list}>
        {items.map((item, index) => {
          const isActive = item.id === activeId;
          const href = isOwner 
            ? `/dashboard?edit=${type}&id=${item.id}` 
            : type === 'post' 
              ? `/u/${item.userId}/p/${item.slug}` 
              : `/u/${item.userId}/b/${item.slug}`;

          const actionLabel = isOwner 
            ? (type === 'post' ? 'Editar poema' : 'Editar libro')
            : (type === 'post' ? 'Ver poema' : 'Detalles del libro');

          return (
            <li key={item.id} className={`${styles.item} ${isActive ? styles.itemActive : ''} ${!item.isVisible ? styles.itemHidden : ''}`}>
              <div className={styles.itemMain}>
                <Link
                  href={href}
                  className={styles.link}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
                  <div className={styles.contentCol}>
                    <span className={styles.title}>{item.title}</span>
                    {isPublic && type === 'book' && item.content && (
                      <div 
                        className={styles.details}
                        dangerouslySetInnerHTML={{ __html: sanitizeMarkdown(item.content) }}
                      />
                    )}
                  </div>
                  <span className={styles.meta}>
                    {!item.isVisible && <span className={styles.badge}>oculto</span>}
                    <span className={styles.actionText}>{actionLabel}</span>
                    <span className={styles.arrow}>→</span>
                  </span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
