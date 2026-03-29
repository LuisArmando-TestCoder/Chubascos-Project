'use client';
import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { QrModal } from '@/components/organisms/QrModal/QrModal';
import { getUserPosts } from '@/actions/data';
import { useSavedItems } from '@/hooks/useSavedItems';
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
  const [qrOpen, setQrOpen] = useState(false);
  const [showExpiredEvents, setShowExpiredEvents] = useState(false);
  const { isUserSaved, saveUser, unsaveUser } = useSavedItems();
  const isSaved = isUserSaved(user.id);
  const name = user.username || user.email.split('@')[0];
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/${user.id}` : `/u/${user.id}`;

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
        <article className={styles.profileArticle}>
          <header className={styles.profileHeader}>
            <div className={styles.avatarBlock}>
              <div className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</div>
              <span className={styles.label}>Perfil Verificado</span>
            </div>

            <h1 className={styles.name}>{name}</h1>

            <div className={styles.bioBlock}>
              <span className={styles.label}>Biografía</span>
              {user.bio ? (
                <div className={styles.bioText}>{user.bio}</div>
              ) : (
                <p className={styles.emptyBio}>Este poeta aún no ha compartido su historia.</p>
              )}
            </div>

            <div className={styles.interaction}>
              <div className={styles.actions}>
                <button
                  className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
                  onClick={() => isSaved ? unsaveUser(user.id) : saveUser(user.id)}
                >
                  {isSaved ? 'Siguiendo' : 'Seguir Poeta'}
                </button>
                <button className={styles.qrBtn} onClick={() => setQrOpen(true)}>
                  Compartir Perfil
                </button>
              </div>
            </div>
          </header>

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

        <aside className={styles.sidebar}>
          {user.contacts?.length > 0 && (
            <section className={styles.sidebarSection}>
              <h3 className={styles.sidebarTitle}>Canales digitales</h3>
              <div className={styles.linksList}>
                {user.contacts.map((c, i) => (
                  <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                    {c.label} →
                  </a>
                ))}
              </div>
            </section>
          )}

          <div className={styles.statsSection}>
            <div className={styles.statItem}>
              <span className={styles.label}>Publicaciones</span>
              <span className={styles.statValue}>{posts.length}</span>
            </div>
            {initialEvents.length > 0 && (
              <div className={styles.statItem}>
                <span className={styles.label}>Eventos</span>
                <span className={styles.statValue}>{initialEvents.length}</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} url={profileUrl} label={name} />
    </main>
  );
}
