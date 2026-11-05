'use client';
import { useState, useCallback } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { BookPreviewModal } from '@/components/organisms/BookPreviewModal/BookPreviewModal';
import type { User, Post } from '@/types';
import type { PageDescriptor } from '@/utils/pdfBook/pageModel';
import styles from './BookDownloadButton.module.scss';
import { WaterText } from '@/components/organisms/WaterText/WaterText';

interface BookDownloadButtonProps {
  user: User;
  posts: Post[];
  /** Cover title; defaults to the author's name. */
  bookTitle?: string;
  /** Print the "Sobre el autor" pages (default true). */
  includeBio?: boolean;
  /** `given` keeps the caller's order; `chronological` (default) sorts by publication. */
  order?: 'chronological' | 'given';
  /** Include hidden poems the caller passes (the composer lets poets choose). */
  includeHidden?: boolean;
  /** Hide the built-in heading when a surrounding panel already explains it. */
  bare?: boolean;
}

function tsSeconds(ts: unknown): number {
  const s = (ts as { seconds?: number } | null)?.seconds;
  return typeof s === 'number' ? s : 0;
}

export function BookDownloadButton({ user, posts, bookTitle, includeBio = true, order = 'chronological', includeHidden = false, bare = false }: BookDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pages, setPages] = useState<PageDescriptor[]>([]);
  const [filename, setFilename] = useState('poemario.pdf');

  // Only visible poems, in chronological (publication) order — the order a
  // reader would encounter them, and what the índice will reflect.
  const chosen = posts.filter((p) => includeHidden || p.isVisible !== false);
  const visiblePoems = order === 'given'
    ? chosen
    : chosen.slice().sort((a, b) => tsSeconds(a.createdAt) - tsSeconds(b.createdAt));

  const authorName = user.username || user.email.split('@')[0];

  const handlePreview = useCallback(async () => {
    if (visiblePoems.length === 0) {
      setMsg(includeHidden ? 'Elige al menos un poema.' : 'No tienes poemas visibles para generar un libro.');
      return;
    }
    setLoading(true);
    setMsg('Componiendo tu libro…');
    try {
      const profileUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/u/${encodeURIComponent(user.id)}`
          : `/u/${user.id}`;

      // Code-split: the PDF engine (jsPDF + qrcode) is only loaded on demand.
      const { composePoemBook } = await import('@/utils/pdfBook/generateBook');

      const { pages: composed, filename: name } = await composePoemBook({
        authorName,
        bookTitle: bookTitle?.trim() || undefined,
        bio: includeBio ? user.bio : undefined,
        contacts: includeBio ? user.contacts : undefined,
        profileUrl,
        poems: visiblePoems.map((p) => ({ title: p.title, content: p.content })),
      });

      setPages(composed);
      setFilename(name);
      setPreviewOpen(true);
      setMsg('');
    } catch (err) {
      console.error('composePoemBook error:', err);
      setMsg(err instanceof Error && err.message ? err.message : 'No se pudo generar el libro. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [visiblePoems, user.id, user.bio, user.contacts, authorName, bookTitle, includeBio, includeHidden]);

  const handleDownload = useCallback(async () => {
    try {
      const { downloadComposedBook } = await import('@/utils/pdfBook/generateBook');
      downloadComposedBook(pages, filename);
    } catch (err) {
      console.error('downloadComposedBook error:', err);
      setMsg('No se pudo descargar el PDF.');
    }
  }, [pages, filename]);

  return (
    <div className={bare ? styles.bare : styles.wrapper}>
      {!bare && <div className={styles.header}>
        <span className={styles.label}>Publicación</span>
        <h3 className={styles.title}><WaterText text="Descargar libro" /></h3>
        <p className={styles.hint}>
          Genera un PDF con portada, biografía, índice enlazado y todos tus poemas
          ({visiblePoems.length}), listo para enviar a una editorial. Verás una vista
          previa antes de descargar.
        </p>
      </div>}
      <Button onClick={handlePreview} loading={loading} disabled={visiblePoems.length === 0}>
        {bare ? `Componer y previsualizar (${visiblePoems.length})` : 'Vista previa del libro'}
      </Button>
      {msg && <p className={styles.msg} role="status" aria-live="polite">{msg}</p>}

      <BookPreviewModal
        isOpen={previewOpen}
        pages={pages}
        filename={filename}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </div>
  );
}
