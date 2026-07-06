'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/atoms/Button/Button';
import { PAGE } from '@/utils/pdfBook/geometry';
import type { PageDescriptor, PageElement } from '@/utils/pdfBook/pageModel';
import styles from './BookPreviewModal.module.scss';

interface BookPreviewModalProps {
  isOpen: boolean;
  pages: PageDescriptor[];
  filename: string;
  onClose: () => void;
  onDownload: () => void;
}

// On-screen page width in CSS pixels; everything else scales from PDF points.
const PREVIEW_WIDTH = 340;

// Serif stack approximating jsPDF's "times" so the preview reads like the PDF.
const PREVIEW_FONT = 'Georgia, "Times New Roman", serif';

function ElementView({ el, scale }: { el: PageElement; scale: number }) {
  if (el.kind === 'text') {
    const left = el.x * scale;
    // Convert PDF baseline to a CSS top edge (ascent ≈ 0.8·size).
    const top = (el.y - el.size * 0.8) * scale;
    const transform =
      el.align === 'center' ? 'translateX(-50%)' : el.align === 'right' ? 'translateX(-100%)' : undefined;
    return (
      <span
        style={{
          position: 'absolute',
          left,
          top,
          transform,
          fontFamily: PREVIEW_FONT,
          fontSize: el.size * scale,
          lineHeight: 1,
          color: el.color,
          fontWeight: el.style === 'bold' ? 700 : 400,
          fontStyle: el.style === 'italic' ? 'italic' : 'normal',
          whiteSpace: 'nowrap',
        }}
      >
        {el.text}
      </span>
    );
  }

  if (el.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.dataUrl}
        alt="QR"
        style={{
          position: 'absolute',
          left: el.x * scale,
          top: el.y * scale,
          width: el.w * scale,
          height: el.h * scale,
        }}
      />
    );
  }

  if (el.kind === 'rule') {
    const left = Math.min(el.x1, el.x2) * scale;
    const top = el.y1 * scale;
    const width = Math.abs(el.x2 - el.x1) * scale;
    return (
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height: 0,
          borderTop: `${Math.max(el.width * scale, 0.5)}px ${el.dashed ? 'dashed' : 'solid'} ${el.color}`,
        }}
      />
    );
  }

  // Links are PDF-only affordances; not drawn in the preview.
  return null;
}

function PageView({ page, scale }: { page: PageDescriptor; scale: number }) {
  return (
    <div
      className={styles.page}
      style={{ width: PAGE.width * scale, height: PAGE.height * scale }}
    >
      {page.elements.map((el, i) => (
        <ElementView key={i} el={el} scale={scale} />
      ))}
    </div>
  );
}

export function BookPreviewModal({ isOpen, pages, filename, onClose, onDownload }: BookPreviewModalProps) {
  const scale = PREVIEW_WIDTH / PAGE.width;
  // How many pages have been streamed into the DOM so far.
  const [visibleCount, setVisibleCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Stream pages in progressively so the main thread stays responsive and the
  // user watches the book build itself page by page.
  useEffect(() => {
    if (!isOpen) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    let count = 0;
    const CHUNK = 2; // pages per frame

    const step = () => {
      count = Math.min(pages.length, count + CHUNK);
      setVisibleCount(count);
      if (count < pages.length) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, pages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const streaming = visibleCount < pages.length;
  const shown = useMemo(() => pages.slice(0, visibleCount), [pages, visibleCount]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Vista previa del libro"
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={styles.header}>
              <div>
                <span className={styles.label}>Vista previa</span>
                <h2 className={styles.title}>{filename}</h2>
              </div>
              <div className={styles.status}>
                {streaming
                  ? `Componiendo… ${visibleCount}/${pages.length}`
                  : `${pages.length} páginas`}
              </div>
            </header>

            <div className={styles.pagesScroll}>
              <div className={styles.pagesGrid}>
                {shown.map((page, i) => (
                  <div key={i} className={styles.pageWrap}>
                    <PageView page={page} scale={scale} />
                    <span className={styles.pageIndex}>{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <footer className={styles.footer}>
              <button className={styles.closeBtn} onClick={onClose}>
                Cerrar
              </button>
              <Button onClick={onDownload} disabled={streaming}>
                {streaming ? 'Preparando…' : 'Descargar PDF'}
              </Button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
