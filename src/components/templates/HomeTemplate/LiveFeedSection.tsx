import Link from 'next/link';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { SectionHeader } from '@/components/molecules/SectionHeader/SectionHeader';
import i18n from '@/utils/i18n';
import type { Post, Tag } from '@/types';
import styles from './HomeTemplate.module.scss';

interface LiveFeedSectionProps {
  posts: Post[];
  tagMap?: Record<string, Tag>;
}

export function LiveFeedSection({ posts, tagMap = {} }: LiveFeedSectionProps) {
  if (posts.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="feed-heading">
      <div className={styles.sectionInner}>
        <SectionHeader
          id="feed-heading"
          title={i18n.home.liveFeed.title}
          echo="charcos"
        />
        <ol className={styles.feedList}>
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                showAuthor
                tags={(post.tagIds || []).map((id) => tagMap[id]).filter(Boolean) as Tag[]}
              />
            </li>
          ))}
        </ol>
        <div className={styles.sectionCta}>
          <Link href="/buscar?type=posts" className={styles.ctaBtn}>
            {i18n.common.seeMore}
          </Link>
          <Link href="/buscar" className={styles.ctaBtnGhost}>
            Buscar en los poemas
          </Link>
        </div>
      </div>
    </section>
  );
}
