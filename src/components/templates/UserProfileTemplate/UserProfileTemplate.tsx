'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { PostCard } from '@/components/molecules/PostCard/PostCard';
import { QrModal } from '@/components/organisms/QrModal/QrModal';
import { Button } from '@/components/atoms/Button/Button';
import { getUserPosts } from '@/actions/data';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { User, Post } from '@/types';
import styles from './UserProfileTemplate.module.scss';

interface UserProfileTemplateProps {
  user: User;
  initialPosts: Post[];
  nextCursor: string | null;
}

export function UserProfileTemplate({ user, initialPosts, nextCursor: initialCursor }: UserProfileTemplateProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const { isUserSaved, saveUser, unsaveUser } = useSavedItems();
  const isSaved = isUserSaved(user.id);
  const name = user.username || user.email.split('@')[0];
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/${user.id}` : `/u/${user.id}`;

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    const result = await getUserPosts(user.id, 10, cursor);
    setPosts((prev) => [...prev, ...result.items]);
    setCursor(result.nextCursor);
    setLoading(false);
  }, [cursor, loading, user.id]);

  const sentinelRef = useInfiniteScroll({ onLoadMore: loadMore, hasMore: !!cursor });

  return (
    <div className={styles.page}>
      <header className={styles.profile}>
        <div className={styles.profileInner}>
          <div className={styles.avatar}>{name.slice(0, 1).toUpperCase()}</div>
          <div className={styles.info}>
            <h1 className={styles.name}>{name}</h1>
            {user.bio && <p className={styles.bio}>{user.bio}</p>}
            {user.contacts?.length > 0 && (
              <ul className={styles.contacts}>
                {user.contacts.map((c, i) => (
                  <li key={i}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className={styles.contact}>
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.actions}>
            <button
              className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
              onClick={() => isSaved ? unsaveUser(user.id) : saveUser(user.id)}
              aria-label={isSaved ? `Dejar de guardar a ${name}` : `Guardar a ${name}`}
            >
              {isSaved ? 'Guardado' : 'Guardar'}
            </button>
            <button
              className={styles.qrBtn}
              onClick={() => setQrOpen(true)}
              aria-label="Ver código QR de este perfil"
            >
              QR
            </button>
          </div>
        </div>
      </header>

      <main className={styles.posts}>
        <div className={styles.postsInner}>
          <h2 className={styles.postsTitle}>Poemas</h2>
          {posts.length === 0 ? (
            <p className={styles.empty}>Aún sin poemas publicados.</p>
          ) : (
            posts.map((post) => (
              <motion.div
                key={post.id}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                viewport={{ once: true }}
              >
                <PostCard post={post} />
              </motion.div>
            ))
          )}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loading && <p className={styles.loading}>Cargando más…</p>}
        </div>
      </main>

      <QrModal isOpen={qrOpen} onClose={() => setQrOpen(false)} url={profileUrl} label={name} />
    </div>
  );
}
