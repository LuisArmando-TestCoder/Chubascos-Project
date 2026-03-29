'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { UserCard } from '@/components/molecules/UserCard/UserCard';
import { Footer } from '@/components/organisms/Footer/Footer';
import { getTags, getTagsByIds, searchPostsByTag, searchEventsByTag, searchExpiredEventsByTag, searchUsersByTag } from '@/actions/data';
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
  const [tagMap, setTagMap] = useState<Record<string, Tag>>({});

  // Helper: merge newly fetched tags into tagMap
  const mergeTagsForItems = useCallback(async (items: (Post | Event)[]) => {
    const ids = [...new Set(items.flatMap((item) => (item as any).tagIds || []))];
    const missing = ids.filter((id) => !tagMap[id]);
    if (missing.length === 0) return;
    const fetched = await getTagsByIds(missing);
    setTagMap((prev) => ({
      ...prev,
      ...Object.fromEntries(fetched.map((t) => [t.id, t])),
    }));
  }, [tagMap]);

  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [eventCursor, setEventCursor] = useState<string | null>(null);
  const [userCursor, setUserCursor] = useState<string | null>(null);

  const [expiredEvents, setExpiredEvents] = useState<Event[]>([]);
  const [expiredEventCursor, setExpiredEventCursor] = useState<string | null>(null);
  const [showExpiredEvents, setShowExpiredEvents] = useState(false);
  const [expiredLoading, setExpiredLoading] = useState(false);
  const [expiredLoaded, setExpiredLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch all three tabs in parallel when a tag is selected
  const searchAll = useCallback(async (tag: string) => {
    if (!tag) return;
    setLoading(true);
    setHasSearched(true);
    setExpiredEvents([]);
    setExpiredEventCursor(null);
    setShowExpiredEvents(false);
    setExpiredLoaded(false);

    const [postsResult, eventsResult, usersResult] = await Promise.all([
      searchPostsByTag(tag, 10),
      searchEventsByTag(tag, 10),
      searchUsersByTag(tag, 10),
    ]);

    // Resolve tags for all results in one batch
    const allTagIds = [
      ...new Set([
        ...postsResult.items.flatMap((p) => p.tagIds || []),
        ...eventsResult.items.flatMap((e) => e.tagIds || []),
      ]),
    ];
    if (allTagIds.length > 0) {
      const fetched = await getTagsByIds(allTagIds);
      setTagMap(Object.fromEntries(fetched.map((t) => [t.id, t])));
    } else {
      setTagMap({});
    }

    setPosts(postsResult.items);
    setPostCursor(postsResult.nextCursor);
    setEvents(eventsResult.items);
    setEventCursor(eventsResult.nextCursor);
    setUsers(usersResult.items);
    setUserCursor(usersResult.nextCursor);

    // Auto-switch to the first tab that actually has results
    if (postsResult.items.length > 0) setActiveTab('posts');
    else if (eventsResult.items.length > 0) setActiveTab('events');
    else if (usersResult.items.length > 0) setActiveTab('users');

    setLoading(false);
  }, []);

  const loadTagSuggestions = useCallback(async (prefix: string) => {
    const results = await getTags(20, prefix || undefined);
    setTags(results);
  // Note: intentionally not auto-selecting here; we do that via the mounted effect below
  }, []);

  // Helper: fetch and merge tags for new items
  async function fetchAndMergeTags(items: (Post | Event)[], currentTagMap: Record<string, Tag>) {
    const ids = [...new Set(items.flatMap((item) => (item as any).tagIds || []))];
    const missing = ids.filter((id) => !currentTagMap[id]);
    if (missing.length === 0) return;
    const fetched = await getTagsByIds(missing);
    setTagMap((prev) => ({
      ...prev,
      ...Object.fromEntries(fetched.map((t) => [t.id, t])),
    }));
  }

  // Load more per tab
  const loadMorePosts = useCallback(async () => {
    if (!selectedTag || !postCursor) return;
    const result = await searchPostsByTag(selectedTag, 10, postCursor);
    await fetchAndMergeTags(result.items, tagMap);
    setPosts((prev) => [...prev, ...result.items]);
    setPostCursor(result.nextCursor);
  }, [selectedTag, postCursor, tagMap]);

  const loadMoreEvents = useCallback(async () => {
    if (!selectedTag || !eventCursor) return;
    const result = await searchEventsByTag(selectedTag, 10, eventCursor);
    await fetchAndMergeTags(result.items, tagMap);
    setEvents((prev) => [...prev, ...result.items]);
    setEventCursor(result.nextCursor);
  }, [selectedTag, eventCursor, tagMap]);

  const loadMoreUsers = useCallback(async () => {
    if (!selectedTag || !userCursor) return;
    const result = await searchUsersByTag(selectedTag, 10, userCursor);
    setUsers((prev) => [...prev, ...result.items]);
    setUserCursor(result.nextCursor);
  }, [selectedTag, userCursor]);

  const loadExpiredEvents = useCallback(async (tag: string, reset = true) => {
    if (!tag) return;
    setExpiredLoading(true);
    const result = await searchExpiredEventsByTag(tag, 10, reset ? undefined : expiredEventCursor || undefined);
    await fetchAndMergeTags(result.items, tagMap);
    setExpiredEvents((prev) => reset ? result.items : [...prev, ...result.items]);
    setExpiredEventCursor(result.nextCursor);
    setExpiredLoaded(true);
    setExpiredLoading(false);
  }, [expiredEventCursor, tagMap]);

  const handleToggleExpired = useCallback(() => {
    if (!showExpiredEvents && !expiredLoaded && selectedTag) {
      loadExpiredEvents(selectedTag, true);
    }
    setShowExpiredEvents((prev) => !prev);
  }, [showExpiredEvents, expiredLoaded, selectedTag, loadExpiredEvents]);

  // On mount: load tags, then auto-select the first one if no tag is pre-selected
  useEffect(() => {
    async function init() {
      const results = await getTags(20);
      setTags(results);
      if (!initialTag && results.length > 0) {
        setSelectedTag(results[0].id);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selectedTag changes, fetch all tabs at once
  useEffect(() => {
    if (selectedTag) searchAll(selectedTag);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTag]);

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
              {[...tags]
                .filter(tag => ((tag.usedByPosts || 0) + (tag.usedByEvents || 0)) > 0 || tag.id === selectedTag)
                .sort((a, b) => (b.id === selectedTag ? 1 : 0) - (a.id === selectedTag ? 1 : 0))
                .map((tag) => {
                  const isSelected = selectedTag === tag.id;
                  const totalCount = (tag.usedByPosts || 0) + (tag.usedByEvents || 0) + (isSelected ? users.length : 0);
                  return (
                    <button
                      key={tag.id}
                      className={`${styles.tagBtn} ${isSelected ? styles.active : ''}`}
                      onClick={() => setSelectedTag(tag.id)}
                      aria-pressed={isSelected}
                    >
                      #{tag.value}
                      {isSelected && loading && <span className={styles.tagSpinner} aria-hidden="true" />}
                      {isSelected && !loading && <span className={styles.tagCount}>{totalCount}</span>}
                    </button>
                  );
                })}
            </div>
          )}

          <div className={styles.tabs} role="tablist">
            {(['posts', 'events', 'users'] as TabType[]).map((tab) => {
              let label = tab === 'posts' ? i18n.common.poems : tab === 'events' ? i18n.common.events : i18n.common.poets;
              let count = tab === 'posts' ? posts.length : tab === 'events' ? events.length : users.length;

              if (selectedTag) {
                const tagObj = tags.find(t => t.id === selectedTag);
                if (tagObj) {
                  if (tab === 'posts') count = tagObj.usedByPosts ?? posts.length;
                  else if (tab === 'events') count = tagObj.usedByEvents ?? events.length;
                  else count = users.length;
                }
                label += ` (${count})`;
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

          {hasSearched && !loading && selectedTag && activeTab === 'posts' && posts.length === 0 && (
            <p className={styles.hint}>No se encontraron poemas para esta etiqueta.</p>
          )}

          {hasSearched && !loading && selectedTag && activeTab === 'users' && users.length === 0 && (
            <p className={styles.hint}>No se encontraron poetas para esta etiqueta.</p>
          )}

          {hasSearched && !loading && selectedTag && activeTab === 'events' && events.length === 0 && expiredEvents.length === 0 && (
            <p className={styles.hint}>No se encontraron eventos para esta etiqueta.</p>
          )}

          {!loading && activeTab === 'posts' && posts.length > 0 && (
            <div className={styles.results}>
              {posts.map((post, i) => (
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
                <button className={styles.loadMore} onClick={loadMorePosts}>
                  {i18n.common.seeMore}
                </button>
              )}
            </div>
          )}

          {!loading && activeTab === 'events' && (
            <div>
              {events.length > 0 && (
                <div className={styles.resultsGrid}>
                  {events.map((event, i) => (
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
                <button className={styles.loadMore} onClick={loadMoreEvents}>
                  Cargar más
                </button>
              )}

              {selectedTag && hasSearched && !loading && (
                <div className={styles.expiredToggleRow}>
                  <button
                    className={styles.expiredToggle}
                    onClick={handleToggleExpired}
                    aria-expanded={showExpiredEvents}
                  >
                    {showExpiredEvents ? '▲ Ocultar expirados' : '▼ Ver eventos expirados'}
                    {expiredLoading && <span className={styles.tagSpinner} aria-hidden="true" />}
                  </button>
                </div>
              )}

              {showExpiredEvents && expiredEvents.length > 0 && (
                <div className={styles.resultsGrid}>
                  {expiredEvents.map((event, i) => (
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
                    <button className={styles.loadMore} onClick={() => loadExpiredEvents(selectedTag, false)}>
                      Cargar más expirados
                    </button>
                  )}
                </div>
              )}

              {showExpiredEvents && expiredLoaded && expiredEvents.length === 0 && (
                <p className={styles.hint}>No hay eventos expirados para esta etiqueta.</p>
              )}
            </div>
          )}

          {!loading && activeTab === 'users' && users.length > 0 && (
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
                <button className={styles.loadMore} onClick={loadMoreUsers}>
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
