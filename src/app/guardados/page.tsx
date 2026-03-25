'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/organisms/Footer/Footer';
import { useSavedStore } from '@/store/saved';
import styles from './guardados.module.scss';

export default function GuardadosPage() {
  const { posts, users, events, unsavePost, unsaveUser, unsaveEvent } = useSavedStore();
  const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'events'>('posts');

  const totalSaved = posts.length + users.length + events.length;

  return (
    <>
      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <h1 className={styles.title}>Guardados</h1>
            {totalSaved === 0 && (
              <p className={styles.empty}>
                No has guardado ningún poema, poeta ni evento todavía.
                <br />
                <Link href="/" className={styles.link}>Explorar Chubascos</Link>
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
                    {tab === 'posts' ? `Poemas (${posts.length})` : tab === 'users' ? `Poetas (${users.length})` : `Eventos (${events.length})`}
                  </button>
                ))}
              </div>

              {activeTab === 'posts' && (
                <ul className={styles.list}>
                  {posts.length === 0 ? (
                    <p className={styles.emptyTab}>Sin poemas guardados.</p>
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
                    <p className={styles.emptyTab}>Sin poetas guardados.</p>
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
                    <p className={styles.emptyTab}>Sin eventos guardados.</p>
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
