import Link from 'next/link';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import type { Post, Tag } from '@/types';
import styles from './PostCard.module.scss';

interface PostCardProps {
  post: Post;
  authorName?: string;
  tags?: Tag[];
  showAuthor?: boolean;
  badge?: string;
}

export function PostCard({ post, authorName, tags = [], showAuthor = false, badge }: PostCardProps) {
  const href = `/u/${post.userId}/p/${post.slug}`;
  return (
    <article className={styles.card}>
      {badge && <span className={styles.badge}>{badge}</span>}
      <Link href={href} className={styles.inner}>
        <h3 className={styles.title}>{post.title}</h3>
        <p className={styles.preview}>
          {post.content.replace(/[#*`_~[\]()>]/g, '').slice(0, 120)}
          {post.content.length > 120 ? '…' : ''}
        </p>
      </Link>
      <footer className={styles.footer}>
        {showAuthor && authorName && (
          <Link href={`/u/${post.userId}`} className={styles.author}>
            {authorName}
          </Link>
        )}
        <div className={styles.tags}>
          {tags.slice(0, 4).map((tag) => (
            <TagPill key={tag.id} value={tag.value} tagId={tag.id} size="sm" />
          ))}
        </div>
        <time className={styles.date} dateTime={String(post.updatedAt)}>
          {post.updatedAt ? formatDate(post.updatedAt) : ''}
        </time>
      </footer>
    </article>
  );
}
