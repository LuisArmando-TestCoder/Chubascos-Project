import React from 'react';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { UserCard } from '@/components/molecules/UserCard/UserCard';
import i18n from '@/utils/i18n';
import styles from '../buscar.module.scss';
import type { Post, Event, User, Tag, Book } from '@/types';
import type { PublicUser } from '@/actions/data';
import type { TabType } from './BuscarTabs';

interface BuscarResultsProps {
  activeTab: TabType;
  loading: boolean;
  hasSearched: boolean;
  selectedTag: string;

  posts: Post[];
  postCursor: string | null;
  onLoadMorePosts: () => void;

  books: Book[];
  bookCursor: string | null;
  onLoadMoreBooks: () => void;

  events: Event[];
  eventCursor: string | null;
  onLoadMoreEvents: () => void;

  users: PublicUser[];
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

const tagsOf = (ids: string[] | undefined, map: Record<string, Tag>) =>
  (ids || []).map((id) => map[id]).filter(Boolean) as Tag[];

function LoadMore({ onClick, label = i18n.common.seeMore }: { onClick: () => void; label?: string }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      className={styles.loadMore}
      aria-busy={busy}
      disabled={busy}
      onClick={async () => { setBusy(true); try { await onClick(); } finally { setBusy(false); } }}
    >
      {busy ? i18n.common.loading : label}
    </button>
  );
}

export function BuscarResults(props: BuscarResultsProps) {
  const {
    activeTab, loading, hasSearched, selectedTag,
    posts, postCursor, onLoadMorePosts,
    books, bookCursor, onLoadMoreBooks,
    events, eventCursor, onLoadMoreEvents,
    users, userCursor, onLoadMoreUsers,
    expiredEvents, expiredEventCursor, showExpiredEvents, expiredLoading, expiredLoaded,
    onToggleExpired, onLoadExpired, tagMap,
  } = props;

  const panel = (children: React.ReactNode) => (
    <div id="buscar-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`} className={`${styles.panel} ${loading ? styles.panelLoading : ''}`}>
      {children}
    </div>
  );

  if (!selectedTag) {
    return panel(<p className={styles.hint}>Toca una etiqueta o escribe una palabra para empezar.</p>);
  }

  if (loading && !hasSearched) {
    return panel(<p className={styles.loading}>{i18n.common.loading}</p>);
  }

  if (activeTab === 'posts') {
    return panel(posts.length === 0
      ? <p className={styles.hint}>Aún no ha llovido ningún poema bajo esta etiqueta.</p>
      : (
        <>
          <ol className={styles.results}>
            {posts.map((post) => (
              <li key={post.id}><PostCard post={post} showAuthor tags={tagsOf(post.tagIds, tagMap)} /></li>
            ))}
          </ol>
          {postCursor && <LoadMore onClick={onLoadMorePosts} />}
        </>
      ));
  }

  if (activeTab === 'books') {
    return panel(books.length === 0
      ? <p className={styles.hint}>No hay libros bajo esta etiqueta.</p>
      : (
        <>
          <ol className={styles.results}>
            {books.map((book) => (
              <li key={book.id}><PostCard post={book} showAuthor type="book" tags={tagsOf(book.tagIds, tagMap)} /></li>
            ))}
          </ol>
          {bookCursor && <LoadMore onClick={onLoadMoreBooks} />}
        </>
      ));
  }

  if (activeTab === 'events') {
    return panel(
      <>
        {events.length > 0 ? (
          <ul className={styles.resultsGrid}>
            {events.map((event) => (
              <li key={event.id}><EventCard event={event} tags={tagsOf(event.tagIds, tagMap)} /></li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>No hay eventos próximos bajo esta etiqueta.</p>
        )}
        {eventCursor && <LoadMore onClick={onLoadMoreEvents} />}

        {hasSearched && (
          <div className={styles.expiredToggleRow}>
            <button
              type="button"
              className={styles.expiredToggle}
              onClick={onToggleExpired}
              aria-expanded={showExpiredEvents}
              aria-controls="eventos-expirados"
            >
              {showExpiredEvents ? 'Ocultar lluvias pasadas' : 'Ver lluvias pasadas (eventos expirados)'}
              {expiredLoading && <span className={styles.tagSpinner} aria-hidden="true" />}
            </button>
          </div>
        )}

        <div id="eventos-expirados">
          {showExpiredEvents && expiredEvents.length > 0 && (
            <>
              <ul className={styles.resultsGrid}>
                {expiredEvents.map((event) => (
                  <li key={event.id}><EventCard event={event} expired tags={tagsOf(event.tagIds, tagMap)} /></li>
                ))}
              </ul>
              {expiredEventCursor && <LoadMore onClick={onLoadExpired} label="Cargar más expirados" />}
            </>
          )}
          {showExpiredEvents && expiredLoaded && expiredEvents.length === 0 && (
            <p className={styles.hint}>No hay eventos expirados bajo esta etiqueta.</p>
          )}
        </div>
      </>
    );
  }

  return panel(users.length === 0
    ? <p className={styles.hint}>Ningún poeta ha elegido esta etiqueta todavía.</p>
    : (
      <>
        <ul className={styles.resultsGrid}>
          {users.map((user) => (
            <li key={user.id}><UserCard user={user as unknown as User} /></li>
          ))}
        </ul>
        {userCursor && <LoadMore onClick={onLoadMoreUsers} />}
      </>
    ));
}
