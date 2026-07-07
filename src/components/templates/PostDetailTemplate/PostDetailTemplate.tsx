'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { QrModalButton } from '@/components/molecules/QrModalButton/QrModalButton';
import { useState, useEffect, useRef } from 'react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useSession } from '@/hooks/useSession';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useLenis } from 'lenis/react';
import { getPreviousPost, getNextPost } from '@/actions/data';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { UserSidebar } from '@/components/organisms/UserSidebar/UserSidebar';
import { formatDate } from '@/utils/formatDate';
import { sanitizeMarkdown } from '@/utils/sanitizeMarkdown';
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
  prevPost: Post | null;
  nextPost: Post | null;
}

export function PostDetailTemplate({ post, author, shader, tags = [], prevPost: initialPrev, nextPost: initialNext }: PostDetailTemplateProps) {
  const [prevPost, setPrevPost] = useState<Post | null>(initialPrev);
  const [nextPost, setNextPost] = useState<Post | null>(initialNext);
  const [footerTransform, setFooterTransform] = useState(0);
  const { isPostSaved, savePost, unsavePost } = useSavedItems();
  const { session } = useSession();
  const isHidden = useScrollDirection();
  const footerRef = useRef<HTMLElement>(null);
  const lenis = useLenis();
  const isSaved = isPostSaved(post.id);
  const isOwner = session.isLoggedIn && session.userId === post.userId;

  // Track footer position relative to viewport bottom
  useEffect(() => {
    if (!lenis || !footerRef.current) return;

    const handleScroll = () => {
      if (!footerRef.current) return;
      
      const footer = footerRef.current;
      const footerRect = footer.getBoundingClientRect();
      const footerHeight = footer.offsetHeight;
      const viewportHeight = window.innerHeight;
      
      // Distance from footer bottom to viewport bottom
      const distanceFromBottom = viewportHeight - footerRect.bottom;
      
      // If footer is at or near bottom (sticky has hit bottom), don't hide it
      if (distanceFromBottom >= -5) {
        setFooterTransform(0);
      } else if (isHidden) {
        // Calculate how much we can translate based on available space
        const maxTransform = Math.min(footerHeight, Math.abs(distanceFromBottom));
        setFooterTransform(maxTransform);
      } else {
        setFooterTransform(0);
      }
    };

    lenis.on('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      lenis.off('scroll', handleScroll);
    };
  }, [lenis, isHidden]);

  // Client-side fallback: if server returned null for prev/next, retry asynchronously
  useEffect(() => {
    if (initialPrev !== null && initialNext !== null) return;
    let cancelled = false;
    async function loadMissing() {
      const [prev, next] = await Promise.all([
        initialPrev === null ? getPreviousPost(post.userId, post.updatedAt) : Promise.resolve(initialPrev),
        initialNext === null ? getNextPost(post.userId, post.updatedAt) : Promise.resolve(initialNext),
      ]);
      if (cancelled) return;
      if (prev) setPrevPost(prev);
      if (next) setNextPost(next);
    }
    loadMissing();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <UserSidebar user={author} />

        <article className={styles.poemArticle}>
          <header className={styles.poemHeader}>
            <div className={styles.meta}>
              <div className={styles.authorBlock}>
                <span className={styles.label}>Visitar perfil</span>
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

          <footer 
            ref={footerRef}
            className={styles.poemFooter}
            style={{ transform: `translateY(${footerTransform}px)` }}
          >
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
              {isOwner ? (
                <Link href={`/dashboard?edit=post&id=${post.id}`} className={styles.editBtn}>
                  Editar Poema
                </Link>
              ) : (
                <button
                  className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
                  onClick={() => isSaved ? unsavePost(post.id) : savePost(post.id)}
                >
                  {isSaved ? 'Guardado' : 'Guardar Poema'}
                </button>
              )}
              <QrModalButton url={postUrl} label={post.title} />
            </div>
          </footer>

          <nav className={styles.navigation}>
            {nextPost && (
              <Link href={`/u/${post.userId}/p/${nextPost.slug}`} className={styles.navLink}>
                <span className={styles.navLabel}>Anterior</span>
                <span className={styles.navTitle}>{nextPost.title}</span>
              </Link>
            )}
            <div className={styles.navSpacer} />
            {prevPost && (
              <Link href={`/u/${post.userId}/p/${prevPost.slug}`} className={styles.navLink}>
                <span className={styles.navLabel}>Siguiente</span>
                <span className={styles.navTitle}>{prevPost.title}</span>
              </Link>
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
