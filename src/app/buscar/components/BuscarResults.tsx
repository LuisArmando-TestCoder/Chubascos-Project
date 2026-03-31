import React from 'react';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { UserCard } from '@/components/molecules/UserCard/UserCard';
import i18n from '@/utils/i18n';
import styles from '../buscar.module.scss';
import type { Post, Event, User, Tag } from '@/types';
import type { TabType } from './BuscarTabs';

interface BuscarResultsProps {
  activeTab: TabType;
  loading: boolean;
  hasSearched: boolean;
  selectedTag: string;
  query: string; // The text search query for local filtering
  
  posts: Post[];
  postCursor: string | null;
  onLoadMorePosts: () => void;
  
  events: Event[];
  eventCursor: string | null;
  onLoadMoreEvents: () => void;
  
  users: User[];
  userCursor: string | null;
  onLoadMoreUsers: () => void;

  expiredEvents: Event[];
  expiredEventCursor: string | null;
  showExpiredEvents: boolean;
  expiredLoading: boolean;
  expiredLoaded: boolean;
  onToggleExpired: () => void;
  onLoadExpired: () => void;

  tagMap: Record<string, Tag>;
}

export function BuscarResults({
  activeTab,
  loading,
  hasSearched,
  selectedTag,
  query,

  posts,
  postCursor,
  onLoadMorePosts,

  events,
  eventCursor,
  onLoadMoreEvents,

  users,
  userCursor,
  onLoadMoreUsers,

  expiredEvents,
  expiredEventCursor,
  showExpiredEvents,
  expiredLoading,
  expiredLoaded,
  onToggleExpired,
  onLoadExpired,

  tagMap
}: BuscarResultsProps) {
  // Local filtering based on query string
  const q = query.toLowerCase().trim();
  const filteredPosts = posts.filter(p => !q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q));
  const filteredEvents = events.filter(e => !q || e.title.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)));
  const filteredUsers = users.filter(u => !q || (u.username || '').toLowerCase().includes(q));
  const filteredExpiredEvents = expiredEvents.filter(e => !q || e.title.toLowerCase().includes(q));

  if (loading) {
    return <p className={styles.loading}>{i18n.common.loading}</p>;
  }

  // If there's no selected tag AND no text query, prompt user
  // Wait, if there's no tag, they can still text-search if we want, but currently 
  // BuscarContent forces selectedTag. Let's just follow the existing logic where they need something.
  if (!selectedTag && !q) {
    return <p className={styles.hint}>Selecciona una etiqueta o escribe un nombre para empezar a buscar.</p>;
  }

  return (
    <>
      {hasSearched && activeTab === 'posts' && filteredPosts.length === 0 && (
        <p className={styles.hint}>No se encontraron poemas para esta búsqueda.</p>
      )}

      {hasSearched && activeTab === 'users' && filteredUsers.length === 0 && (
        <p className={styles.hint}>No se encontraron poetas para esta búsqueda.</p>
      )}

      {hasSearched && activeTab === 'events' && filteredEvents.length === 0 && filteredExpiredEvents.length === 0 && (
        <p className={styles.hint}>No se encontraron eventos para esta búsqueda.</p>
      )}

      {activeTab === 'posts' && filteredPosts.length > 0 && (
        <div className={styles.results}>
          {filteredPosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <PostCard
                post={post}
                showAuthor
                tags={(post.tagIds || []).map((id) => tagMap[id]).filter(Boolean) as Tag[]}
              />
            </motion.div>
          ))}
          {postCursor && (
            <button className={styles.loadMore} onClick={onLoadMorePosts}>
              {i18n.common.seeMore}
            </button>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div>
          {filteredEvents.length > 0 && (
            <div className={styles.resultsGrid}>
              {filteredEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <EventCard
                    event={event}
                    tags={(event.tagIds || []).map((id) => tagMap[id]).filter(Boolean) as Tag[]}
                  />
                </motion.div>
              ))}
            </div>
          )}
          
          {eventCursor && (
            <button className={styles.loadMore} onClick={onLoadMoreEvents}>
              Cargar más
            </button>
          )}

          {hasSearched && (
            <div className={styles.expiredToggleRow}>
              <button
                className={styles.expiredToggle}
                onClick={onToggleExpired}
                aria-expanded={showExpiredEvents}
              >
                {showExpiredEvents ? '▲ Ocultar expirados' : '▼ Ver eventos expirados'}
                {expiredLoading && <span className={styles.tagSpinner} aria-hidden="true" />}
              </button>
            </div>
          )}

          {showExpiredEvents && filteredExpiredEvents.length > 0 && (
            <div className={styles.resultsGrid}>
              {filteredExpiredEvents.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <EventCard
                    event={event}
                    expired
                    tags={(event.tagIds || []).map((id) => tagMap[id]).filter(Boolean) as Tag[]}
                  />
                </motion.div>
              ))}
              {expiredEventCursor && (
                <button className={styles.loadMore} onClick={onLoadExpired}>
                  Cargar más expirados
                </button>
              )}
            </div>
          )}

          {showExpiredEvents && expiredLoaded && filteredExpiredEvents.length === 0 && (
            <p className={styles.hint}>No hay eventos expirados para esta búsqueda.</p>
          )}
        </div>
      )}

      {activeTab === 'users' && filteredUsers.length > 0 && (
        <div className={styles.resultsGrid}>
          {filteredUsers.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <UserCard user={user} />
            </motion.div>
          ))}
          {userCursor && (
            <button className={styles.loadMore} onClick={onLoadMoreUsers}>
              Cargar más
            </button>
          )}
        </div>
      )}
    </>
  );
}
