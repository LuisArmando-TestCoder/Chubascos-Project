'use client';
import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { UserSidebar } from '@/components/organisms/UserSidebar/UserSidebar';
import { getUserPosts } from '@/actions/data';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import i18n from '@/utils/i18n';
import type { User, Post, Event } from '@/types';
import styles from './UserProfileTemplate.module.scss';

interface UserProfileTemplateProps {
  user: User;
  initialPosts: Post[];
  nextCursor: string | null;
  initialEvents: Event[];
}

function isEventExpired(event: Event): boolean {
  const day = event.day as any;
  const secs = typeof day?.seconds === 'number' ? day.seconds : 0;
  return secs * 1000 < Date.now();
}

export function UserProfileTemplate({ user, initialPosts, nextCursor: initialCursor, initialEvents }: UserProfileTemplateProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [showExpiredEvents, setShowExpiredEvents] = useState(false);

  const upcomingEvents = useMemo(() => initialEvents.filter((e) => !isEventExpired(e)), [initialEvents]);
  const expiredEvents = useMemo(() => initialEvents.filter((e) => isEventExpired(e)), [initialEvents]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    const result = await getUserPosts(user.id, 10, cursor);
    setPosts((prev) => [...prev, ...result.items]);
    setCursor(result.nextCursor);
    setLoading(false);
  }, [cursor, loading, user.id]);

  const sentinelRef = useInfiniteScroll({ onLoadMore: loadMore, hasMore: !!cursor });

  return (
    <main className={styles.page}>
      <div className={styles.contentGrid}>
        <UserSidebar user={user} />

        <article className={styles.profileArticle}>
          {/* Poems section */}
          <section className={styles.poemsSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.label}>Obra publicada</span>
              <h2 className={styles.sectionTitle}>Poemas</h2>
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
                    <PostCard post={post} />
                  </motion.div>
                ))
              )}
            </div>
            <div ref={sentinelRef} style={{ height: 40 }} />
            {loading && <p className={styles.loading}>{i18n.common.loading}</p>}
          </section>

          {/* Events section */}
          {initialEvents.length > 0 && (
            <section className={styles.eventsSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.label}>Presencia en vivo</span>
                <h2 className={styles.sectionTitle}>Eventos</h2>
              </div>

              {upcomingEvents.length === 0 && expiredEvents.length > 0 && (
                <p className={styles.empty}>No hay eventos próximos.</p>
              )}

              {upcomingEvents.length > 0 && (
                <div className={styles.eventsGrid}>
                  {upcomingEvents.map((event, i) => (
                    <motion.div
                      key={event.id}
                      whileInView={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      viewport={{ once: true }}
                    >
                      <EventCard event={event} />
                    </motion.div>
                  ))}
                </div>
              )}

              {expiredEvents.length > 0 && (
                <>
                  <button
                    className={styles.expiredToggle}
                    onClick={() => setShowExpiredEvents((v) => !v)}
                    aria-expanded={showExpiredEvents}
                  >
                    {showExpiredEvents ? '▲ Ocultar expirados' : `▼ Ver eventos expirados (${expiredEvents.length})`}
                  </button>

                  {showExpiredEvents && (
                    <div className={styles.eventsGrid}>
                      {expiredEvents.map((event, i) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <EventCard event={event} expired />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
