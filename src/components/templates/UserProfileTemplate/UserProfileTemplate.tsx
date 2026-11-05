'use client';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { UserSidebar } from '@/components/organisms/UserSidebar/UserSidebar';
import { DashboardPostsList } from '@/components/templates/DashboardTemplate/DashboardPostsList';
import { getUserPosts, getTagsByIds } from '@/actions/data';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useSession } from '@/hooks/useSession';
import i18n from '@/utils/i18n';
import type { User, Post, Event, Tag, Book } from '@/types';
import styles from './UserProfileTemplate.module.scss';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import { KindredVoices } from '@/components/organisms/KindredVoices/KindredVoices';
import type { Kindred } from '@/lib/affinity';

interface UserProfileTemplateProps {
  user: User;
  initialPosts: Post[];
  nextCursor: string | null;
  initialEvents: Event[];
  initialBooks?: Book[];
  initialTagMap?: Record<string, Tag>;
  kindred?: Kindred[];
}

export function UserProfileTemplate({ user, initialPosts, nextCursor: initialCursor, initialEvents, initialBooks = [], initialTagMap = {}, kindred = [] }: UserProfileTemplateProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  // tagMap accumulates resolved Tag objects keyed by their ID
  const [tagMap, setTagMap] = useState<Record<string, Tag>>(initialTagMap);
  const { session } = useSession();
  const isOwner = session.isLoggedIn && session.userId === user.id;


  // Helper: resolve tagIds → Tag[]
  const resolveTags = useCallback((tagIds: string[] = []): Tag[] =>
    tagIds.map((id) => tagMap[id]).filter(Boolean) as Tag[]
  , [tagMap]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    const result = await getUserPosts(user.id, 10, cursor);
    // Fetch tags for newly loaded posts that aren't already in tagMap
    const newTagIds = [
      ...new Set(result.items.flatMap((p) => p.tagIds || [])),
    ].filter((id) => !tagMap[id]);
    if (newTagIds.length > 0) {
      const newTags = await getTagsByIds(newTagIds);
      setTagMap((prev) => ({
        ...prev,
        ...Object.fromEntries(newTags.map((t) => [t.id, t])),
      }));
    }
    setPosts((prev) => [...prev, ...result.items]);
    setCursor(result.nextCursor);
    setLoading(false);
  }, [cursor, loading, user.id, tagMap]);

  const sentinelRef = useInfiniteScroll({ onLoadMore: loadMore, hasMore: !!cursor });

  return (
    <main className={styles.page}>
      <div className={styles.contentGrid}>
        <UserSidebar user={user} events={initialEvents} />

        <article className={styles.profileArticle}>
          {/* Poems section */}
          <section className={styles.poemsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}><WaterText text="Poemas" /></h2>
            </div>

            <div className={styles.postsGrid}>
              {posts.length === 0 ? (
                <p className={styles.empty}>{i18n.profile.emptyPoems}</p>
              ) : (
                posts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    whileInView={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5, delay: i % 3 * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <PostCard post={post} tags={resolveTags(post.tagIds)} />
                  </motion.div>
                ))
              )}
            </div>
            <div ref={sentinelRef} style={{ height: 40 }} />
            {loading && <p className={styles.loading}>{i18n.common.loading}</p>}
          </section>

          {/* Who writes like this voice, read from the tags of their work */}
          <KindredVoices voices={kindred} />

          {/* Books section */}
          {initialBooks.length > 0 && (
            <section className={styles.booksSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}><WaterText text="Libros" /></h2>
              </div>

              <DashboardPostsList 
                items={initialBooks} 
                type="book" 
                title="Lista de Libros" 
                isPublic 
                isOwner={isOwner} 
              />
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
