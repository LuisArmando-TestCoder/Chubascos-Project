'use client';
import { useState, useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from '@/components/organisms/Footer/Footer';
import { getTagCloud } from '@/actions/data';
import { logout } from '@/actions/auth';
import type { User, Post, Event, Tag, Shader, Book } from '@/types';
import { useProfileStore } from '@/store/profile';
import { useSavedStore } from '@/store/saved';
import { KindredVoices } from '@/components/organisms/KindredVoices/KindredVoices';
import type { Kindred } from '@/lib/affinity';
import { DropSigil } from '@/components/atoms/DropSigil/DropSigil';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import { isEventPast } from '@/utils/eventTime';
import { ProfilePanel } from './panels/ProfilePanel';
import { PoemPanel } from './panels/PoemPanel';
import { EventPanel } from './panels/EventPanel';
import { BookPanel } from './panels/BookPanel';
import { PoetEvents } from '@/components/organisms/PoetEvents/PoetEvents';
import { poemStats } from './studio/text';
import styles from './DashboardTemplate.module.scss';

interface DashboardTemplateProps {
  user: User;
  userPosts?: Post[];
  userBooks?: Book[];
  userEvents?: Event[];
  editPost?: Post | null;
  editBook?: Book | null;
  editShader?: Shader | null;
  editEvent?: Event | null;
  /** `?copy=` — an event to repeat on a new date. */
  copyEvent?: Event | null;
  editPrevPost?: Post | null;
  editNextPost?: Post | null;
  editPrevEvent?: Event | null;
  editNextEvent?: Event | null;
  kindred?: Kindred[];
  /** `?tab=` from the URL: perfil | poema | evento | libro. */
  initialTab?: string;
}

type DashTab = 'perfil' | 'nuevo-poema' | 'nuevo-evento' | 'mis-libros';
const TABS: DashTab[] = ['perfil', 'nuevo-poema', 'nuevo-evento', 'mis-libros'];
const TAB_PARAM: Record<DashTab, string> = { 'perfil': 'perfil', 'nuevo-poema': 'poema', 'nuevo-evento': 'evento', 'mis-libros': 'libro' };
const PARAM_TAB = Object.fromEntries(Object.entries(TAB_PARAM).map(([k, v]) => [v, k])) as Record<string, DashTab>;

export function DashboardTemplate({
  user, userPosts = [], userBooks = [], userEvents = [], editPost, editBook, editShader, editEvent, copyEvent,
  editPrevPost, editNextPost, editPrevEvent, editNextEvent, kindred = [], initialTab,
}: DashboardTemplateProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashTab>(() => {
    if (editPost) return 'nuevo-poema';
    if (editEvent || copyEvent) return 'nuevo-evento';
    if (editBook) return 'mis-libros';
    return (initialTab && PARAM_TAB[initialTab]) || 'perfil';
  });
  const [visited, setVisited] = useState<Set<DashTab>>(() => new Set([activeTab]));
  const tabRefs = useRef<Record<DashTab, HTMLButtonElement | null>>({ 'perfil': null, 'nuevo-poema': null, 'nuevo-evento': null, 'mis-libros': null });
  const { username: liveName } = useProfileStore();
  const name = liveName || user.username || user.email.split('@')[0];

  // ── Tags: loaded once for every picker ──────────────────────────────────
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  useEffect(() => {
    let live = true;
    getTagCloud()
      .then((tags) => { if (live) setAvailableTags(tags); })
      .catch((e) => console.error('Failed to load tags', e))
      .finally(() => { if (live) setTagsLoading(false); });
    return () => { live = false; };
  }, []);

  // Keep the open chapter in the URL so reloads and shared links land here.
  const selectTab = useCallback((tab: DashTab) => {
    setActiveTab(tab);
    setVisited((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)));
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', TAB_PARAM[tab]);
      window.history.replaceState(window.history.state, '', url);
    } catch { /* ignore */ }
  }, []);

  // WAI-ARIA tabs: arrows move between chapters, Home/End jump to the ends.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, tab: DashTab) => {
    const i = TABS.indexOf(tab);
    const next =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? TABS[(i + 1) % TABS.length]
      : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? TABS[(i - 1 + TABS.length) % TABS.length]
      : e.key === 'Home' ? TABS[0]
      : e.key === 'End' ? TABS[TABS.length - 1]
      : null;
    if (!next) return;
    e.preventDefault();
    selectTab(next);
    tabRefs.current[next]?.focus();
  };

  // Saved work shows up in the lists without a reload.
  const refresh = useCallback(() => router.refresh(), [router]);

  const handleLogout = async () => {
    await logout();
    useProfileStore.getState().setProfile({ isLoggedIn: false, userId: '', email: '', username: '' });
    useSavedStore.getState().clearAll();
    window.location.href = '/';
  };

  const stats = useMemo(() => [
    { label: 'Poemas', value: userPosts.length },
    { label: 'Versos', value: userPosts.reduce((n, p) => n + poemStats(p.content || '').verses, 0) },
    { label: 'Eventos', value: userEvents.filter((e) => !isEventPast(e)).length, hint: 'próximos' },
    { label: 'Libros', value: userBooks.length },
  ], [userPosts, userBooks, userEvents]);

  const labels: Record<DashTab, { tab: string; title: string; fresh: string }> = {
    'perfil': { tab: 'Perfil', title: 'Tu perfil', fresh: '' },
    'nuevo-poema': { tab: editPost ? 'Editar poema' : 'Nuevo poema', title: editPost ? 'Editar poema' : 'Nuevo poema', fresh: '+ Nuevo poema' },
    'nuevo-evento': { tab: editEvent ? 'Editar evento' : 'Eventos', title: editEvent ? 'Editar evento' : 'Nuevo evento', fresh: '+ Nuevo evento' },
    'mis-libros': { tab: editBook ? 'Editar libro' : 'Libros', title: editBook ? 'Editar libro' : 'Libros y poemario', fresh: '+ Nuevo libro' },
  };
  const isEditing = (tab: DashTab) =>
    (tab === 'nuevo-poema' && editPost) || (tab === 'nuevo-evento' && editEvent) || (tab === 'mis-libros' && editBook);

  return (
    <>
      <div className={styles.page}>
        <div className={styles.inner}>
          <aside className={styles.rail} data-lenis-prevent>
            <div className={styles.identity}>
              <DropSigil name={name} size={88} className={styles.greetingSigil} glyph={name.slice(0, 1).toUpperCase()} />
              <div>
                <span className={styles.studioLabel}>Taller de</span>
                <h1 className={styles.greeting}><WaterText text={name} /></h1>
              </div>
            </div>

            <dl className={styles.stats}>
              {stats.map((s) => (
                <div key={s.label} className={styles.stat} title={s.hint}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>

            <div className={styles.tabs} role="tablist" aria-orientation="vertical" aria-label="Secciones del taller">
              {TABS.map((tab) => (
                <div key={tab} className={styles.tabGroup}>
                  <button
                    ref={(el) => { tabRefs.current[tab] = el; }}
                    id={`tab-${tab}`}
                    role="tab"
                    type="button"
                    aria-selected={activeTab === tab}
                    aria-controls={`panel-${tab}`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                    onClick={() => selectTab(tab)}
                    onKeyDown={(e) => onTabKey(e, tab)}
                  >
                    {labels[tab].tab}
                  </button>
                  {isEditing(tab) && (
                    <Link href={`/dashboard?tab=${TAB_PARAM[tab]}`} className={styles.newItemBtn}>
                      {labels[tab].fresh}
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Every event, upcoming and past, reachable from any chapter. */}
            <PoetEvents events={userEvents} isOwner activeId={editEvent?.id} title="Tus eventos" fill />

            <div className={styles.headerActions}>
              <Link href={`/u/${encodeURIComponent(user.id)}`} className={styles.profileLink}>
                Ver perfil público
              </Link>
              <button className={styles.logoutBtn} type="button" onClick={handleLogout}>
                Salir
              </button>
            </div>

            <div className={styles.kindred}>
              <KindredVoices voices={kindred.slice(0, 4)} title="Escriben parecido a ti" compact />
            </div>
          </aside>

          <section className={styles.workspace} aria-labelledby="taller-titulo">
            <header className={styles.workspaceHeader}>
              <h2 id="taller-titulo" className={styles.workspaceTitle}><WaterText text={labels[activeTab].title} /></h2>
            </header>

            {/* Panels stay mounted once opened, so switching chapters never loses a draft. */}
            {TABS.filter((tab) => visited.has(tab)).map((tab) => (
              <div
                key={tab}
                id={`panel-${tab}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
                hidden={activeTab !== tab}
                className={styles.tabPanel}
              >
                {tab === 'perfil' && (
                  <ProfilePanel user={user} tags={availableTags} tagsLoading={tagsLoading} onSaved={refresh} />
                )}
                {tab === 'nuevo-poema' && (
                  <PoemPanel
                    user={user} posts={userPosts} books={userBooks}
                    editPost={editPost} editShader={editShader} prevPost={editPrevPost} nextPost={editNextPost}
                    tags={availableTags} tagsLoading={tagsLoading} onSaved={refresh}
                  />
                )}
                {tab === 'nuevo-evento' && (
                  <EventPanel
                    user={user}
                    editEvent={editEvent} copyEvent={copyEvent} prevEvent={editPrevEvent} nextEvent={editNextEvent}
                    tags={availableTags} tagsLoading={tagsLoading} onSaved={refresh}
                  />
                )}
                {tab === 'mis-libros' && (
                  <BookPanel
                    user={user} books={userBooks} posts={userPosts} editBook={editBook}
                    tags={availableTags} tagsLoading={tagsLoading} onSaved={refresh}
                  />
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
