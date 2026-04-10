'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Footer } from '@/components/organisms/Footer/Footer';
import { getTags, getTagsByIds, searchPostsByTag, searchEventsByTag, searchExpiredEventsByTag, searchUsersByTag, searchBooksByTag } from '@/actions/data';
import i18n from '@/utils/i18n';
import type { Post, Event, User, Tag, Book } from '@/types';
import styles from './buscar.module.scss';
import { BuscarTagCloud } from './components/BuscarTagCloud';
import { BuscarTabs, type TabType } from './components/BuscarTabs';
import { BuscarResults } from './components/BuscarResults';

export function BuscarContent() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get('tag') || '';
  const initialType = (searchParams.get('type') as TabType) || 'posts';

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>(initialType);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [tags, setTags] = useState<Tag[]>([]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
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
  const [bookCursor, setBookCursor] = useState<string | null>(null);
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

    const [postsResult, booksResult, eventsResult, usersResult] = await Promise.all([
      searchPostsByTag(tag, 10),
      searchBooksByTag(tag, 10),
      searchEventsByTag(tag, 10),
      searchUsersByTag(tag, 10),
    ]);

    // Resolve tags for all results in one batch
    const allTagIds = [
      ...new Set([
        ...postsResult.items.flatMap((p) => p.tagIds || []),
        ...booksResult.items.flatMap((b) => b.tagIds || []),
        ...eventsResult.items.flatMap((e) => e.tagIds || []),
        tag // Ensure the selected tag itself is in the map
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
    setBooks(booksResult.items);
    setBookCursor(booksResult.nextCursor);
    setEvents(eventsResult.items);
    setEventCursor(eventsResult.nextCursor);
    setUsers(usersResult.items);
    setUserCursor(usersResult.nextCursor);

    // Keep current tab if it has results, otherwise switch to the first one with results
    setActiveTab((currentTab) => {
      if (currentTab === 'posts' && postsResult.items.length === 0) {
        if (booksResult.items.length > 0) return 'books';
        return eventsResult.items.length > 0 ? 'events' : (usersResult.items.length > 0 ? 'users' : 'posts');
      }
      if (currentTab === 'books' && booksResult.items.length === 0) {
        if (postsResult.items.length > 0) return 'posts';
        return eventsResult.items.length > 0 ? 'events' : (usersResult.items.length > 0 ? 'users' : 'books');
      }
      if (currentTab === 'events' && eventsResult.items.length === 0) {
        if (postsResult.items.length > 0) return 'posts';
        if (booksResult.items.length > 0) return 'books';
        return usersResult.items.length > 0 ? 'users' : 'events';
      }
      if (currentTab === 'users' && usersResult.items.length === 0) {
        if (postsResult.items.length > 0) return 'posts';
        if (booksResult.items.length > 0) return 'books';
        return eventsResult.items.length > 0 ? 'events' : 'users';
      }
      return currentTab;
    });

    setLoading(false);
  }, []);

  const loadTagSuggestions = useCallback(async (prefix: string) => {
    const results = await getTags(20, prefix || undefined);
    setTags(results);
  // Note: intentionally not auto-selecting here; we do that via the mounted effect below
  }, []);

  // Helper: fetch and merge tags for new items
  async function fetchAndMergeTags(items: (Post | Event | Book)[], currentTagMap: Record<string, Tag>) {
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

  const loadMoreBooks = useCallback(async () => {
    if (!selectedTag || !bookCursor) return;
    const result = await searchBooksByTag(selectedTag, 10, bookCursor);
    await fetchAndMergeTags(result.items, tagMap);
    setBooks((prev) => [...prev, ...result.items]);
    setBookCursor(result.nextCursor);
  }, [selectedTag, bookCursor, tagMap]);

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

  // On mount: load tags, then auto-select a random one if no tag is pre-selected
  useEffect(() => {
    async function init() {
      const results = await getTags(100);
      setTags(results);
      if (!initialTag && results.length > 0) {
        const tagsWithItems = results.filter(
          (t) => t.usedByPosts > 0 || t.usedByEvents > 0 || (t.usedByBooks && t.usedByBooks > 0)
        );
        const validTags = tagsWithItems.length > 0 ? tagsWithItems : results;
        const randomIndex = Math.floor(Math.random() * validTags.length);
        setSelectedTag(validTags[randomIndex].id);
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

          <BuscarTagCloud
            tags={tags}
            tagMap={tagMap}
            selectedTag={selectedTag}
            users={users}
            loading={loading}
            onSelectTag={setSelectedTag}
          />

          <BuscarTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedTag={selectedTag}
            tags={tags}
            tagMap={tagMap}
            posts={posts}
            books={books}
            events={events}
            users={users}
          />

          <BuscarResults
            activeTab={activeTab}
            loading={loading}
            hasSearched={hasSearched}
            selectedTag={selectedTag}
            query={query}
            posts={posts}
            postCursor={postCursor}
            onLoadMorePosts={loadMorePosts}
            books={books}
            bookCursor={bookCursor}
            onLoadMoreBooks={loadMoreBooks}
            events={events}
            eventCursor={eventCursor}
            onLoadMoreEvents={loadMoreEvents}
            users={users}
            userCursor={userCursor}
            onLoadMoreUsers={loadMoreUsers}
            expiredEvents={expiredEvents}
            expiredEventCursor={expiredEventCursor}
            showExpiredEvents={showExpiredEvents}
            expiredLoading={expiredLoading}
            expiredLoaded={expiredLoaded}
            onToggleExpired={handleToggleExpired}
            onLoadExpired={() => loadExpiredEvents(selectedTag, false)}
            tagMap={tagMap}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
