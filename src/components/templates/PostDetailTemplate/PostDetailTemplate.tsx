'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { QrModalButton } from '@/components/molecules/QrModalButton/QrModalButton';
import { useState, useEffect } from 'react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import { sanitizeMarkdown } from '@/utils/sanitizeMarkdown';
import { getPreviousPost, getNextPost } from '@/actions/data';
import i18n from '@/utils/i18n';
import type { Post, User, Shader, Tag } from '@/types';
import styles from './PostDetailTemplate.module.scss';

const ShaderCanvas = dynamic(() => import('@/components/organisms/ShaderCanvas/ShaderCanvas'), {
  ssr: false,
  loading: () => null,
});

interface PostDetailTemplateProps {
  post: Post;
  author: User;
  shader: Shader | null;
  tags?: Tag[];
}

export function PostDetailTemplate({ post, author, shader, tags = [] }: PostDetailTemplateProps) {
  const [prevPost, setPrevPost] = useState<Post | null>(null);
  const [nextPost, setNextPost] = useState<Post | null>(null);
  const { isPostSaved, savePost, unsavePost } = useSavedItems();
  const isSaved = isPostSaved(post.id);

  useEffect(() => {
    async function loadNeighbors() {
      const [prev, next] = await Promise.all([
        getPreviousPost(post.userId, post.updatedAt),
        getNextPost(post.userId, post.updatedAt)
      ]);
      setPrevPost(prev);
      setNextPost(next);
    }
    loadNeighbors();
  }, [post.userId, post.updatedAt]);

  const authorName = author.username || author.email.split('@')[0];
  const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/u/${post.userId}/p/${post.slug}`;
  const safeHtml = sanitizeMarkdown(post.content);

  return (
    <main className={styles.page}>
      {shader && !shader.isDeleted && (
        <div className={styles.shaderBg} aria-hidden="true">
          <ShaderCanvas glslCode={shader.glslCode} />
        </div>
      )}

      <div className={styles.contentGrid}>
        <article className={styles.poemArticle}>
          <header className={styles.poemHeader}>
            <div className={styles.meta}>
              <div className={styles.authorBlock}>
                 <span className={styles.label}>Escrito por</span>
                 <Link href={`/u/${post.userId}`} className={styles.authorName}>
                    {authorName}
                 </Link>
              </div>
              <div className={styles.dateBlock}>
                 <span className={styles.label}>Publicado el</span>
                 <time className={styles.date}>
                   {post.updatedAt ? formatDate(post.updatedAt) : ''}
                 </time>
              </div>
            </div>

            <h1 className={styles.title}>{post.title}</h1>
          </header>

          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          <footer className={styles.poemFooter}>
             <div className={styles.tagsSection}>
                {tags.length > 0 && (
                  <div className={styles.tags}>
                    {tags.map((tag) => (
                      <TagPill key={tag.id} tagId={tag.id} value={tag.value} size="sm" />
                    ))}
                  </div>
                )}
             </div>

             <div className={styles.interactions}>
                <button
                  className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
                  onClick={() => isSaved ? unsavePost(post.id) : savePost(post.id)}
                >
                  {isSaved ? 'Guardado' : 'Guardar Poema'}
                </button>
                <QrModalButton url={postUrl} label={post.title} />
             </div>
          </footer>

          <nav className={styles.navigation}>
            {prevPost && (
              <Link href={`/u/${post.userId}/p/${prevPost.slug}`} className={styles.navLink}>
                <span className={styles.navLabel}>Anterior</span>
                <span className={styles.navTitle}>{prevPost.title}</span>
              </Link>
            )}
            <div className={styles.navSpacer} />
            {nextPost && (
              <Link href={`/u/${post.userId}/p/${nextPost.slug}`} className={styles.navLink}>
                <span className={styles.navLabel}>Siguiente</span>
                <span className={styles.navTitle}>{nextPost.title}</span>
              </Link>
            )}
          </nav>
        </article>

        <aside className={styles.sidebar}>
          <div className={styles.authorCard}>
             <div className={styles.avatar}>{authorName.slice(0, 1).toUpperCase()}</div>
             <div className={styles.authorInfo}>
                <span className={styles.label}>Sobre el autor</span>
                <p className={styles.authorBio}>{author.bio || 'Poeta en constante búsqueda.'}</p>
                <Link href={`/u/${post.userId}`} className={styles.viewProfile}>
                  Ver perfil completo
                </Link>
             </div>
          </div>

          <div className={styles.creativeEngineering}>
            <p className={styles.title}>CHUBASCOS</p>
            <p className={styles.text}>
              Cada verso es un charco donde se refleja el alma. 
              Explora, siente y conecta.
            </p>
          </div>
        </aside>
      </div>

    </main>
  );
}
