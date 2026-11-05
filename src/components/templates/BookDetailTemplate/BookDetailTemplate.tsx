'use client';
import Link from 'next/link';
import { QrModalButton } from '@/components/molecules/QrModalButton/QrModalButton';
import { UserSidebar } from '@/components/organisms/UserSidebar/UserSidebar';
import { formatDate } from '@/utils/formatDate';
import { sanitizeMarkdown } from '@/utils/sanitizeMarkdown';
import type { Book, Event, User } from '@/types';
import styles from './BookDetailTemplate.module.scss';
import { bookPath, profilePath, publicName } from '@/lib/handles';

interface BookDetailTemplateProps {
  book: Book;
  author: User;
  authorEvents?: Event[];
}

export function BookDetailTemplate({ book, author, authorEvents }: BookDetailTemplateProps) {
  const authorName = publicName(author);
  const owner = author?.handle ? author : book;
  const bookUrl = typeof window !== 'undefined' ? `${window.location.origin}${bookPath(owner, book.slug)}` : '';
  const safeHtml = sanitizeMarkdown(book.content);

  return (
    <main className={styles.page}>
      <div className={styles.contentGrid}>
        <UserSidebar user={author} events={authorEvents} />

        <article className={styles.bookArticle}>
          <header className={styles.bookHeader}>
            <div className={styles.meta}>
              <div className={styles.authorBlock}>
                <span className={styles.label}>Publicado por</span>
                <Link href={profilePath(owner)} className={styles.authorName}>
                  {authorName}
                </Link>
              </div>
              <div className={styles.dateBlock}>
                <span className={styles.label}>Fecha</span>
                <time className={styles.date}>
                  {book.updatedAt ? formatDate(book.updatedAt) : ''}
                </time>
              </div>
            </div>

            <h1 className={styles.title}>{book.title}</h1>
          </header>

          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          <footer className={styles.bookFooter}>
            <div className={styles.interactions}>
              <QrModalButton url={bookUrl} label={book.title} />
              <Link href={profilePath(owner)} className={styles.backBtn}>
                Volver al perfil
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
