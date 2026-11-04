'use client';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Footer } from '@/components/organisms/Footer/Footer';
import {
  getTagsByIds, searchByTag, searchPoems, searchPostsByTag, searchEventsByTag,
  searchExpiredEventsByTag, searchPublicUsersByTag, searchBooksByTag,
  type TagSearchResult, type PoemHit,
} from '@/actions/data';
import { dropAt, drop, toneFor } from '@/lib/fluid/bus';
import type { Post, Event, Tag, Book } from '@/types';
import styles from './buscar.module.scss';
import { TagExplorer } from '@/components/organisms/TagExplorer/TagExplorer';
import { TagLineage } from './components/TagLineage';
import { BuscarTabs, type TabType } from './components/BuscarTabs';
import { BuscarResults } from './components/BuscarResults';
import { PoemHits } from './components/PoemHits';

type PoemResult = { hits: PoemHit[]; tagMap: Record<string, Tag>; total: number };

interface BuscarContentProps {
  tags: Tag[];
  initialTag: string;
  initialType: TabType;
  initialQuery: string;
  initialTagResult: TagSearchResult | null;
  initialPoemResult: PoemResult | null;
}

/** The branch the current results came from (tag + descendants). */
const scopeOf = (r: TagSearchResult, fallback: string) => (r.scope.length ? r.scope : fallback);

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function firstTabWithResults(current: TabType, r: TagSearchResult): TabType {
  const has: Record<TabType, boolean> = {
    posts: r.posts.length > 0, books: r.books.length > 0, events: r.events.length > 0, users: r.users.length > 0,
  };
  if (has[current]) return current;
  return (['posts', 'books', 'events', 'users'] as TabType[]).find((t) => has[t]) ?? current;
}

/** Keep the address shareable without a navigation (no refetch, no scroll jump). */
function syncUrl(params: Record<string, string>) {
  const url = new URL(window.location.href);
  url.search = '';
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, v));
  window.history.replaceState(window.history.state, '', url);
}

export function BuscarContent({ tags, initialTag, initialType, initialQuery, initialTagResult, initialPoemResult }: BuscarContentProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTagResult ? firstTabWithResults(initialType, initialTagResult) : initialType
  );
  const [result, setResult] = useState<TagSearchResult | null>(initialTagResult);
  const [tagMap, setTagMap] = useState<Record<string, Tag>>({
    ...Object.fromEntries(tags.map((t) => [t.id, t])),
    ...(initialTagResult?.tagMap || {}),
    ...(initialPoemResult?.tagMap || {}),
  });
  const [poems, setPoems] = useState<PoemResult | null>(initialPoemResult);
  const [loading, setLoading] = useState(false);
  const [poemLoading, setPoemLoading] = useState(false);

  const [expiredEvents, setExpiredEvents] = useState<Event[]>([]);
  const [expiredEventCursor, setExpiredEventCursor] = useState<string | null>(null);
  const [showExpiredEvents, setShowExpiredEvents] = useState(false);
  const [expiredLoading, setExpiredLoading] = useState(false);
  const [expiredLoaded, setExpiredLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);
  const poemRequestRef = useRef(0);
  // Tags already searched this visit answer instantly.
  const memo = useRef(new Map<string, TagSearchResult>(initialTag && initialTagResult ? [[initialTag, initialTagResult]] : []));

  const mergeTags = useCallback((map: Record<string, Tag>) => {
    setTagMap((prev) => ({ ...prev, ...map }));
  }, []);

  const fetchMissingTags = useCallback(async (items: (Post | Event | Book)[]) => {
    const ids = [...new Set(items.flatMap((item) => item.tagIds || []))].filter((id) => !tagMap[id]);
    if (ids.length === 0) return;
    const fetched = await getTagsByIds(ids);
    mergeTags(Object.fromEntries(fetched.map((t) => [t.id, t])));
  }, [tagMap, mergeTags]);

  // ── Tag search ──────────────────────────────────────────────────────────
  const selectTag = useCallback(async (tagId: string, origin?: Element | null) => {
    if (origin) dropAt(origin, { tone: toneFor(tagId), power: 1.1 });
    setSelectedTag(tagId);
    setExpiredEvents([]);
    setExpiredEventCursor(null);
    setShowExpiredEvents(false);
    setExpiredLoaded(false);
    syncUrl({ tag: tagId, q: query.trim().length >= 2 ? query.trim() : '' });

    const cached = memo.current.get(tagId);
    if (cached) {
      setResult(cached);
      setActiveTab((t) => firstTabWithResults(t, cached));
      return;
    }
    const id = ++requestRef.current;
    setLoading(true);
    const r = await searchByTag(tagId);
    if (id !== requestRef.current) return; // a newer choice won
    memo.current.set(tagId, r);
    mergeTags(r.tagMap);
    setResult(r);
    setActiveTab((t) => firstTabWithResults(t, r));
    setLoading(false);
  }, [mergeTags, query]);

  // ── Poem text search ────────────────────────────────────────────────────
  const runPoemSearch = useCallback(async (q: string) => {
    const id = ++poemRequestRef.current;
    if (q.trim().length < 2) {
      setPoems(null);
      setPoemLoading(false);
      return;
    }
    setPoemLoading(true);
    const r = await searchPoems(q);
    if (id !== poemRequestRef.current) return;
    mergeTags(r.tagMap);
    setPoems(r);
    setPoemLoading(false);
  }, [mergeTags]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Every keystroke is a drop on the water, somewhere along the field.
    const el = inputRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const x = r.left + Math.min(r.width - 24, 24 + val.length * 13);
      drop(x, r.top + r.height / 2, { tone: 'puddle', power: 0.45, radius: 14 });
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runPoemSearch(val);
      syncUrl({ q: val.trim().length >= 2 ? val.trim() : '', tag: selectedTag });
    }, 220);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Load more (unchanged contracts) ─────────────────────────────────────
  const append = useCallback(<K extends 'posts' | 'books' | 'events' | 'users'>(key: K, items: TagSearchResult[K], cursorKey: keyof TagSearchResult, cursor: string | null) => {
    setResult((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: [...prev[key], ...items], [cursorKey]: cursor } as TagSearchResult;
      memo.current.set(selectedTag, next);
      return next;
    });
  }, [selectedTag]);

  const loadMorePosts = useCallback(async () => {
    if (!selectedTag || !result?.postCursor) return;
    const r = await searchPostsByTag(scopeOf(result, selectedTag), 10, result.postCursor);
    await fetchMissingTags(r.items);
    append('posts', r.items, 'postCursor', r.nextCursor);
  }, [selectedTag, result, fetchMissingTags, append]);

  const loadMoreBooks = useCallback(async () => {
    if (!selectedTag || !result?.bookCursor) return;
    const r = await searchBooksByTag(scopeOf(result, selectedTag), 10, result.bookCursor);
    await fetchMissingTags(r.items);
    append('books', r.items, 'bookCursor', r.nextCursor);
  }, [selectedTag, result, fetchMissingTags, append]);

  const loadMoreEvents = useCallback(async () => {
    if (!selectedTag || !result?.eventCursor) return;
    const r = await searchEventsByTag(scopeOf(result, selectedTag), 10, result.eventCursor);
    await fetchMissingTags(r.items);
    append('events', r.items, 'eventCursor', r.nextCursor);
  }, [selectedTag, result, fetchMissingTags, append]);

  const loadMoreUsers = useCallback(async () => {
    if (!selectedTag || !result?.userCursor) return;
    const r = await searchPublicUsersByTag(scopeOf(result, selectedTag), result.userCursor);
    append('users', r.items, 'userCursor', r.nextCursor);
  }, [selectedTag, result, append]);

  const loadExpiredEvents = useCallback(async (tag: string, reset = true) => {
    if (!tag) return;
    setExpiredLoading(true);
    const r = await searchExpiredEventsByTag(result?.scope.length ? result.scope : tag, 10, reset ? undefined : expiredEventCursor || undefined);
    await fetchMissingTags(r.items);
    setExpiredEvents((prev) => (reset ? r.items : [...prev, ...r.items]));
    setExpiredEventCursor(r.nextCursor);
    setExpiredLoaded(true);
    setExpiredLoading(false);
  }, [expiredEventCursor, fetchMissingTags, result]);

  const handleToggleExpired = useCallback(() => {
    if (!showExpiredEvents && !expiredLoaded && selectedTag) loadExpiredEvents(selectedTag, true);
    setShowExpiredEvents((prev) => !prev);
  }, [showExpiredEvents, expiredLoaded, selectedTag, loadExpiredEvents]);

  // Tags whose name matches what is being typed, accent-insensitive.
  const matchingTags = useMemo(() => {
    const q = fold(query.trim().replace(/^#/, ''));
    if (q.length < 1) return [];
    return tags.filter((t) => fold(t.value).includes(q) || t.slug.includes(q)).slice(0, 12);
  }, [tags, query]);

  const textMode = query.trim().length >= 2;
  // Tab counts cover the whole branch that was searched, not just the tag.
  const branchCount = (key: 'usedByPosts' | 'usedByEvents' | 'usedByBooks') => {
    const ids = result?.scope.length ? result.scope : selectedTag ? [selectedTag] : [];
    if (!ids.length || ids.some((id) => !tagMap[id])) return undefined;
    return ids.reduce((sum, id) => sum + (tagMap[id][key] || 0), 0);
  };
  const selectedTagObj = tagMap[selectedTag];

  return (
    <>
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <span className={styles.kicker}>Pozo de búsqueda</span>
            <h1 className={styles.title}>Buscar en la lluvia</h1>
            <p className={styles.lead}>
              Escribe una palabra y la buscamos dentro de cada poema, título y autor.
              O toca una etiqueta para ver todo lo que cayó bajo ella.
            </p>
          </header>

          <form className={styles.searchBar} role="search" onSubmit={(e) => { e.preventDefault(); runPoemSearch(query); }}>
            <label htmlFor="buscar-input" className="visually-hidden">Buscar en los poemas</label>
            <span className={styles.searchIcon} aria-hidden="true" />
            <input
              id="buscar-input"
              ref={inputRef}
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder="lluvia, madre, mar, un verso que recuerdas…"
              className={styles.input}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              aria-describedby="buscar-status"
            />
            <span className={styles.searchStatus} id="buscar-status" role="status" aria-live="polite">
              {textMode
                ? poemLoading
                  ? 'buscando…'
                  : poems ? `${poems.total} ${poems.total === 1 ? 'poema' : 'poemas'}` : ''
                : selectedTagObj ? `#${selectedTagObj.value}` : ''}
            </span>
          </form>

          {textMode && (
            <PoemHits
              query={query}
              loading={poemLoading}
              result={poems}
              tagMap={tagMap}
              matchingTags={matchingTags}
              onSelectTag={(id, el) => { setQuery(''); setPoems(null); selectTag(id, el); }}
            />
          )}

          <section className={styles.tagSection} aria-labelledby="tags-heading" hidden={textMode}>
            <h2 id="tags-heading" className={styles.subhead}>
              <span>Explorar etiquetas</span>
              <span className={styles.subheadCount}>{tags.length}</span>
            </h2>
            <TagExplorer
              mode="browse"
              label="Explorar etiquetas"
              tags={tags}
              activeTagId={selectedTag}
              loading={loading}
              onSelect={(tag, el) => selectTag(tag.id, el)}
            />
          </section>

          {!textMode && (
            <section className={styles.resultsSection} aria-labelledby="results-heading" aria-busy={loading}>
              <h2 id="results-heading" className={styles.subhead}>
                <span>Bajo {selectedTagObj ? <em className={styles.tagName}>#{selectedTagObj.value}</em> : 'esta etiqueta'}</span>
              </h2>
              {selectedTagObj && (
                <TagLineage tag={selectedTagObj} tags={tags} scopeSize={result?.scope.length ?? 1} onSelect={selectTag} />
              )}
              <BuscarTabs
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                counts={{
                  posts: branchCount('usedByPosts') ?? result?.posts.length ?? 0,
                  events: branchCount('usedByEvents') ?? result?.events.length ?? 0,
                  books: branchCount('usedByBooks') ?? result?.books.length ?? 0,
                  users: result?.users.length ?? 0,
                }}
                showCounts={!!selectedTag}
              />
              <BuscarResults
                activeTab={activeTab}
                loading={loading}
                hasSearched={!!result}
                selectedTag={selectedTag}
                posts={result?.posts ?? []}
                postCursor={result?.postCursor ?? null}
                onLoadMorePosts={loadMorePosts}
                books={result?.books ?? []}
                bookCursor={result?.bookCursor ?? null}
                onLoadMoreBooks={loadMoreBooks}
                events={result?.events ?? []}
                eventCursor={result?.eventCursor ?? null}
                onLoadMoreEvents={loadMoreEvents}
                users={result?.users ?? []}
                userCursor={result?.userCursor ?? null}
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
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
