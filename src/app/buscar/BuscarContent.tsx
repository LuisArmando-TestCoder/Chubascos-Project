'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { UserCard } from '@/components/molecules/UserCard/UserCard';
import { Footer } from '@/components/organisms/Footer/Footer';
import { getTags, searchPostsByTag, searchEventsByTag, searchUsers, searchUsersByTag } from '@/actions/data';
import i18n from '@/utils/i18n';
import type { Post, Event, User, Tag } from '@/types';
import styles from './buscar.module.scss';

type TabType = 'posts' | 'events' | 'users';

export function BuscarContent() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get('tag') || '';
  const initialType = (searchParams.get('type') as TabType) || 'posts';

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>(initialType);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [tags, setTags] = useState<Tag[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [eventCursor, setEventCursor] = useState<string | null>(null);
  const [userCursor, setUserCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTagSuggestions = useCallback(async (prefix: string) => {
    const results = await getTags(20, prefix || undefined);
    setTags(results);
  }, []);

  const search = useCallback(async (tag: string, tab: TabType, reset = true) => {
    if (!tag) return;
    setLoading(true);
    setHasSearched(true);
    if (tab === 'posts') {
      const result = await searchPostsByTag(tag, 10, reset ? undefined : postCursor || undefined);
      setPosts((prev) => reset ? result.items : [...prev, ...result.items]);
      setPostCursor(result.nextCursor);
    } else if (tab === 'events') {
      const result = await searchEventsByTag(tag, 10, reset ? undefined : eventCursor || undefined);
      setEvents((prev) => reset ? result.items : [...prev, ...result.items]);
      setEventCursor(result.nextCursor);
    } else {
      // If we're searching by a selected tag
      if (tags.some(t => t.id === tag)) {
        const result = await searchUsersByTag(tag, 10, reset ? undefined : userCursor || undefined);
        setUsers((prev) => reset ? result.items : [...prev, ...result.items]);
        setUserCursor(result.nextCursor);
      } else {
        // Fallback for direct keyword search
        const result = await searchUsers(tag, 10, reset ? undefined : userCursor || undefined);
        setUsers((prev) => reset ? result.items : [...prev, ...result.items]);
        setUserCursor(result.nextCursor);
      }
    }

    setLoading(false);
  }, [postCursor, eventCursor, userCursor, tags]);

  useEffect(() => {
    loadTagSuggestions('');
  }, [loadTagSuggestions]);

  useEffect(() => {
    if (selectedTag) search(selectedTag, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag, activeTab]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadTagSuggestions(val), 300);
  };

  return (
    <>
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.title}>{i18n.common.search}</h1>
          </header>

          <div className={styles.searchBar}>
            <input
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder={i18n.search.inputPlaceholder}
              className={styles.input}
              aria-label="Campo de búsqueda"
            />
          </div>

          {tags.length > 0 && (
            <div className={styles.tagCloud}>
              {tags.map((tag) => {
                // Incorporate 'usedBy' for backward compatibility just in case
                const legacyCount = (tag as any).usedBy || 0;
                const totalCount = (tag.usedByPosts || 0) + (tag.usedByEvents || 0) + legacyCount;
                
                // Still allow hiding if total is 0 to keep the tag cloud clean
                if (totalCount === 0) return null;
                
                return (
                  <button
                    key={tag.id}
                    className={`${styles.tagBtn} ${selectedTag === tag.id ? styles.active : ''}`}
                    onClick={() => setSelectedTag(tag.id)}
                    aria-pressed={selectedTag === tag.id}
                  >
                    #{tag.value}
                    {totalCount > 0 && <span className={styles.tagCount}>{totalCount}</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.tabs} role="tablist">
            {(['posts', 'events', 'users'] as TabType[]).map((tab) => {
              let label = tab === 'posts' ? i18n.common.poems : tab === 'events' ? i18n.common.events : i18n.common.poets;
              
              if (selectedTag) {
                const tagObj = tags.find(t => t.id === selectedTag);
                if (tagObj) {
                  if (tab === 'posts' && tagObj.usedByPosts !== undefined) {
                    label += ` (${tagObj.usedByPosts})`;
                  } else if (tab === 'events' && tagObj.usedByEvents !== undefined) {
                    label += ` (${tagObj.usedByEvents})`;
                  }
                }
              }

              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {loading && <p className={styles.loading}>{i18n.common.loading}</p>}

          {!selectedTag && !loading && (
            <p className={styles.hint}>Selecciona una etiqueta para empezar a buscar.</p>
          )}

          {hasSearched && !loading && selectedTag && 
            ((activeTab === 'posts' && posts.length === 0) || 
             (activeTab === 'events' && events.length === 0) || 
             (activeTab === 'users' && users.length === 0)) && (
            <p className={styles.hint}>No se encontraron resultados para esta etiqueta en la categoría seleccionada.</p>
          )}

          {activeTab === 'posts' && posts.length > 0 && (
            <div className={styles.results}>
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <PostCard post={post} showAuthor />
                </motion.div>
              ))}
              {postCursor && (
                <button className={styles.loadMore} onClick={() => search(selectedTag, 'posts', false)}>
                  {i18n.common.seeMore}
                </button>
              )}
            </div>
          )}

          {activeTab === 'events' && events.length > 0 && (
            <div className={styles.resultsGrid}>
              {events.map((event, i) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
              {eventCursor && (
                <button className={styles.loadMore} onClick={() => search(selectedTag, 'events', false)}>
                  Cargar más
                </button>
              )}
            </div>
          )}

          {activeTab === 'users' && users.length > 0 && (
            <div className={styles.resultsGrid}>
              {users.map((user, i) => (
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
                <button className={styles.loadMore} onClick={() => search(selectedTag, 'users', false)}>
                  Cargar más
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
