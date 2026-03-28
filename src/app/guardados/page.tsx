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
      const ids = activeTab === 'posts' ? posts : activeTab === 'users' ? users : events;
      const result = await getSavedItems(ids, activeTab);
      setItems(result.items);
      setLoading(false);
    }
    load();
  }, [activeTab, posts, users, events]);

  return (
    <main className={styles.page}>
      <div className={styles.contentGrid}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <span className={styles.label}>Tu Colección</span>
            <h1 className={styles.title}>{i18n.common.saved}</h1>
            {totalSaved === 0 && (
              <p className={styles.empty}>
                {i18n.saved.empty}
                <br />
                <Link href="/" className={styles.exploreLink}>{i18n.common.explore} Chubascos →</Link>
              </p>
            )}
          </header>

          {totalSaved > 0 && (
            <div className={styles.collectionSpace}>
              <div className={styles.tabs} role="tablist">
                {(['posts', 'users', 'events'] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <span className={styles.tabLabel}>
                      {tab === 'posts' ? 'Poemas' : tab === 'users' ? 'Poetas' : 'Eventos'}
                    </span>
                    <span className={styles.tabCount}>
                      {tab === 'posts' ? posts.length : tab === 'users' ? users.length : events.length}
                    </span>
                  </button>
                ))}
              </div>

              <div className={styles.resultsWrapper}>
                {loading ? (
                  <p className={styles.loading}>Actualizando colección...</p>
                ) : (
                  <div className={styles.list}>
                    {items.length === 0 ? (
                      <p className={styles.emptyTab}>
                        {activeTab === 'posts' 
                          ? 'Aún no has guardado ningún poema.' 
                          : activeTab === 'users' 
                            ? 'No sigues a ningún poeta todavía.' 
                            : 'No tienes eventos agendados.'}
                      </p>
                    ) : (
                      items.map((item) => (
                        <div key={item.id} className={styles.item}>
                          <Link 
                            href={activeTab === 'posts' ? `/u/${item.userId}/p/${item.slug}` : activeTab === 'users' ? `/u/${item.id}` : `/e/${item.id}`} 
                            className={styles.itemLink}
                          >
                             <span className={styles.itemLabel}>
                               {activeTab === 'posts' ? 'Poema' : activeTab === 'users' ? 'Poeta' : 'Evento'}
                             </span>
                             <span className={styles.itemValue}>
                               {activeTab === 'posts' ? item.title : activeTab === 'users' ? (item.username || item.email?.split('@')[0] || item.id) : item.title}
                             </span>
                          </Link>
                          <button
                            className={styles.removeBtn}
                            onClick={() => {
                              if (activeTab === 'posts') unsavePost(item.id);
                              else if (activeTab === 'users') unsaveUser(item.id);
                              else unsaveEvent(item.id);
                            }}
                            aria-label="Eliminar"
                          >
                            {activeTab === 'users' ? 'Dejar de seguir' : 'Quitar'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
           <div className={styles.statsCard}>
              <span className={styles.label}>Resumen</span>
              <div className={styles.statLine}>
                 <span className={styles.statLabel}>Total guardado</span>
                 <span className={styles.statValue}>{totalSaved}</span>
              </div>
           </div>

           <div className={styles.creativeEngineering}>
            <p className={styles.title}>CHUBASCOS</p>
            <p className={styles.text}>
              Tu archivo personal de cultura efímera. 
              Lo que guardas hoy, construye tu rastro mañana.
            </p>
          </div>
        </aside>
      </div>

    </main>
  );
}
