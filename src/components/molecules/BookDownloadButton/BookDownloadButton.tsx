'use client';
import { useState, useCallback } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import { BookPreviewModal } from '@/components/organisms/BookPreviewModal/BookPreviewModal';
import type { User, Post } from '@/types';
import type { PageDescriptor } from '@/utils/pdfBook/pageModel';
import styles from './BookDownloadButton.module.scss';

interface BookDownloadButtonProps {
  user: User;
  posts: Post[];
}

function tsSeconds(ts: unknown): number {
  const s = (ts as { seconds?: number } | null)?.seconds;
  return typeof s === 'number' ? s : 0;
}

export function BookDownloadButton({ user, posts }: BookDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pages, setPages] = useState<PageDescriptor[]>([]);
  const [filename, setFilename] = useState('poemario.pdf');

  // Only visible poems, in chronological (publication) order — the order a
  // reader would encounter them, and what the índice will reflect.
  const visiblePoems = posts
    .filter((p) => p.isVisible !== false)
    .slice()
    .sort((a, b) => tsSeconds(a.createdAt) - tsSeconds(b.createdAt));

  const authorName = user.username || user.email.split('@')[0];

  const handlePreview = useCallback(async () => {
    if (visiblePoems.length === 0) {
      setMsg('No tienes poemas visibles para generar un libro.');
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
        bio: user.bio,
        contacts: user.contacts,
        profileUrl,
        poems: visiblePoems.map((p) => ({ title: p.title, content: p.content })),
      });

      setPages(composed);
      setFilename(name);
      setPreviewOpen(true);
      setMsg('');
    } catch (err) {
      console.error('composePoemBook error:', err);
      setMsg('No se pudo generar el libro. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [visiblePoems, user.id, user.bio, user.contacts, authorName]);

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
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Publicación</span>
        <h3 className={styles.title}>Descargar libro</h3>
        <p className={styles.hint}>
          Genera un PDF con portada, biografía, índice enlazado y todos tus poemas
          ({visiblePoems.length}), listo para enviar a una editorial. Verás una vista
          previa antes de descargar.
        </p>
      </div>
      <Button onClick={handlePreview} loading={loading} disabled={visiblePoems.length === 0}>
        Vista previa del libro
      </Button>
      {msg && <p className={styles.msg}>{msg}</p>}

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
