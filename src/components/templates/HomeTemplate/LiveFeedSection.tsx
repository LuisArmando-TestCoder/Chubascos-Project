'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import i18n from '@/utils/i18n';
import type { Post } from '@/types';
import styles from './HomeTemplate.module.scss';

interface LiveFeedSectionProps {
  posts: Post[];
}

export function LiveFeedSection({ posts }: LiveFeedSectionProps) {
  if (posts.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="feed-heading">
      <div className={styles.sectionInner}>
        <header className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="feed-heading">{i18n.home.liveFeed.title}</h2>
          <span className={styles.liveIndicator} aria-label="En vivo">
            <span className={styles.liveDot} aria-hidden="true" />
            en vivo
          </span>
        </header>
        <div className={styles.feedList}>
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.25, 1, 0.5, 1] }}
              viewport={{ once: true }}
            >
              <PostCard post={post} showAuthor />
            </motion.div>
          ))}
        </div>
        <div className={styles.sectionCta}>
          <Link href="/buscar?type=posts" className={styles.ctaBtn}>
            {i18n.common.seeMore}
          </Link>
          <Link href="/buscar?type=posts" className={styles.ctaBtnGhost}>
            {i18n.common.search}
          </Link>
        </div>
      </div>
    </section>
  );
}
