'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { QrModalButton } from '@/components/molecules/QrModalButton/QrModalButton';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { formatDate } from '@/utils/formatDate';
import { sanitizeMarkdown } from '@/utils/sanitizeMarkdown';
import type { Post, User, Shader } from '@/types';
import styles from './PostDetailTemplate.module.scss';

const ShaderCanvas = dynamic(() => import('@/components/organisms/ShaderCanvas/ShaderCanvas'), {
  ssr: false,
  loading: () => null,
});

interface PostDetailTemplateProps {
  post: Post;
  author: User;
  shader: Shader | null;
}

export function PostDetailTemplate({ post, author, shader }: PostDetailTemplateProps) {
  const authorName = author.username || author.email.split('@')[0];
  const postUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/u/${post.userId}/p/${post.slug}`;
  const safeHtml = sanitizeMarkdown(post.content);

  return (
    <article className={styles.article}>
      {shader && !shader.isDeleted && (
        <div className={styles.shaderBg} aria-hidden="true">
          <ShaderCanvas glslCode={shader.glslCode} />
        </div>
      )}
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.meta}>
            <Link href={`/u/${post.userId}`} className={styles.author}>
              {authorName}
            </Link>
            <span className={styles.sep} aria-hidden="true">—</span>
            <time className={styles.date}>
              {post.updatedAt ? formatDate(post.updatedAt) : ''}
            </time>
          </div>
          <h1 className={styles.title}>{post.title}</h1>
          {post.tagIds?.length > 0 && (
            <div className={styles.tags}>
              {post.tagIds.map((id) => (
                <TagPill key={id} tagId={id} value={id} size="sm" />
              ))}
            </div>
          )}
        </header>

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />

        <footer className={styles.footer}>
          <div className={styles.footerActions}>
            <QrModalButton url={postUrl} label={post.title} />
            <Link href={`/u/${post.userId}`} className={styles.back}>
              ← {authorName}
            </Link>
          </div>
          <p className={styles.idHint}>
            ID: <code>{post.id}</code>
          </p>
        </footer>
      </div>
    </article>
  );
}
