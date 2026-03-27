'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/organisms/Footer/Footer';
import { useSavedStore } from '@/store/saved';
import { getSavedItems } from '@/actions/data';
import i18n from '@/utils/i18n';
import styles from './guardados.module.scss';

export default function GuardadosPage() {
  const { posts, users, events, unsavePost, unsaveUser, unsaveEvent } = useSavedStore();
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'events'>('posts');

  const totalSaved = posts.length + users.length + events.length;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // This is a simplified client-side fetch from the new server action
      // In a real app, we'd use useInfiniteScroll hook here
      const result = await getSavedItems('current-user@example.com', activeTab);
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setLoading(false);
    }
    load();
  }, [activeTab]);

  return (
    <>
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.title}>{i18n.common.saved}</h1>
            {totalSaved === 0 && (
              <p className={styles.empty}>
                {i18n.saved.empty}
                <br />
                <Link href="/" className={styles.link}>{i18n.common.explore} Chubascos</Link>
              </p>
            )}
          </header>

          {totalSaved > 0 && (
            <>
              <div className={styles.tabs} role="tablist">
                {(['posts', 'users', 'events'] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === 'posts' 
                      ? i18n.saved.tabs.poems.replace('{count}', posts.length.toString()) 
                      : tab === 'users' 
                        ? i18n.saved.tabs.poets.replace('{count}', users.length.toString()) 
                        : i18n.saved.tabs.events.replace('{count}', events.length.toString())}
                  </button>
                ))}
              </div>

              {activeTab === 'posts' && (
                <ul className={styles.list}>
                  {posts.length === 0 ? (
                    <p className={styles.emptyTab}>{i18n.saved.emptyTab.replace('{type}', i18n.common.poems.toLowerCase())}</p>
                  ) : (
                    posts.map((id) => (
                      <li key={id} className={styles.item}>
                        <Link href={`/p/id/${id}`} className={styles.itemLink}>
                          Poema <code>{id.slice(0, 8)}…</code>
                        </Link>
                        <button
                          className={styles.removeBtn}
                          onClick={() => unsavePost(id)}
                          aria-label={`Eliminar poema ${id} de guardados`}
                        >
                          ✕
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {activeTab === 'users' && (
                <ul className={styles.list}>
                  {users.length === 0 ? (
                    <p className={styles.emptyTab}>{i18n.saved.emptyTab.replace('{type}', i18n.common.poets.toLowerCase())}</p>
                  ) : (
                    users.map((id) => (
                      <li key={id} className={styles.item}>
                        <Link href={`/u/${id}`} className={styles.itemLink}>
                          Perfil <code>{id}</code>
                        </Link>
                        <button
                          className={styles.removeBtn}
                          onClick={() => unsaveUser(id)}
                          aria-label={`Eliminar poeta ${id} de guardados`}
                        >
                          ✕
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {activeTab === 'events' && (
                <ul className={styles.list}>
                  {events.length === 0 ? (
                    <p className={styles.emptyTab}>{i18n.saved.emptyTab.replace('{type}', i18n.common.events.toLowerCase())}</p>
                  ) : (
                    events.map((id) => (
                      <li key={id} className={styles.item}>
                        <Link href={`/e/${id}`} className={styles.itemLink}>
                          Evento <code>{id.slice(0, 8)}…</code>
                        </Link>
                        <button
                          className={styles.removeBtn}
                          onClick={() => unsaveEvent(id)}
                          aria-label={`Eliminar evento ${id} de guardados`}
                        >
                          ✕
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
