'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { QrModalButton } from '@/components/molecules/QrModalButton/QrModalButton';
import { useSavedItems } from '@/hooks/useSavedItems';
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

export function PostDetailTemplate({ post, author, shader, tags = [], prevPost, nextPost }: PostDetailTemplateProps) {
  const { isPostSaved, savePost, unsavePost } = useSavedItems();
  const isSaved = isPostSaved(post.id);

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
                {isSaved ? 'Guardado' : 'Guardar'}
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
      </div>
    </main>
  );
}
