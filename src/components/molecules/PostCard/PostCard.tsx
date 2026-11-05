import Link from 'next/link';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import type { Post, Tag, Book } from '@/types';
import styles from './PostCard.module.scss';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import { profilePath } from '@/lib/handles';

interface PostCardProps {
  post: Post | Book;
  authorName?: string;
  tags?: Tag[];
  showAuthor?: boolean;
  badge?: string;
  type?: 'post' | 'book';
}

/** First lines of a poem, kept as lines: verse should not be flattened. */
function firstLines(content: string, max = 3): string[] {
  return content
    .replace(/[#*`_~[\]()>]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((l) => (l.length > 90 ? `${l.slice(0, 90)}…` : l));
}

function isoDate(ts: unknown): string | undefined {
  if (ts && typeof ts === 'object' && 'seconds' in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000).toISOString();
  }
  return undefined;
}

export function PostCard({ post, authorName, tags = [], showAuthor = false, badge, type = 'post' }: PostCardProps) {
  const char = type === 'post' ? 'p' : 'b';
  const href = `${profilePath(post)}/${char}/${encodeURIComponent(post.slug)}`;
  const name = authorName || (post as Post & { authorName?: string }).authorName;
  const lines = firstLines(post.content);
  const lineCount = post.content.split('\n').filter((l) => l.trim()).length;

  return (
    <article className={`${styles.card} ${type === 'book' ? styles.book : ''}`} data-drop="rain">
      <div className={styles.body}>
        {badge && <span className={styles.badge}>{badge}</span>}
        <h3 className={styles.title}>
          {/* The stretched link makes the whole card one target, tags stay reachable. */}
          <Link href={href} className={styles.inner}><WaterText text={post.title} /></Link>
        </h3>
        <p className={styles.preview}>
          {lines.map((l, i) => (
            <span key={i} className={styles.verse}>{l}</span>
          ))}
        </p>
        <footer className={styles.footer}>
          {showAuthor && name && (
            <Link href={profilePath(post)} className={styles.author}>
              <WaterText text={name} inline />
            </Link>
          )}
          {tags.length > 0 && (
            <div className={styles.tags}>
              {tags.slice(0, 4).map((tag) => (
                <TagPill key={tag.id} value={tag.value} tagId={tag.id} size="sm" />
              ))}
            </div>
          )}
        </footer>
      </div>
      <div className={styles.stratum}>
        <time className={styles.date} dateTime={isoDate(post.updatedAt)}>
          {post.updatedAt ? formatDate(post.updatedAt) : ''}
        </time>
        <span className={styles.lines}>{type === 'book' ? 'libro' : `${lineCount} ${lineCount === 1 ? 'verso' : 'versos'}`}</span>
      </div>
    </article>
  );
}
