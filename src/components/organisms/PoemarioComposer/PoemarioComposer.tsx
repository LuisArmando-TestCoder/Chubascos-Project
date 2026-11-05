'use client';
import { useMemo, useState } from 'react';
import { BookDownloadButton } from '@/components/molecules/BookDownloadButton/BookDownloadButton';
import type { Post, User } from '@/types';
import styles from './PoemarioComposer.module.scss';

type Order = 'chronological' | 'recent' | 'alphabetical' | 'manual';

interface PoemarioComposerProps {
  user: User;
  posts: Post[];
  /** Suggested cover title (e.g. the book being edited). */
  suggestedTitle?: string;
}

const secs = (ts: unknown) => {
  const v = (ts as { seconds?: number } | null)?.seconds;
  return typeof v === 'number' ? v : 0;
};
const collator = new Intl.Collator('es', { sensitivity: 'base' });

/**
 * Build a poemario from your own poems: choose which go in, in what order,
 * under what title, then preview every page before downloading the PDF.
 */
export function PoemarioComposer({ user, posts, suggestedTitle }: PoemarioComposerProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(posts.filter((p) => p.isVisible !== false).map((p) => p.id)));
  const [order, setOrder] = useState<Order>('chronological');
  const [manual, setManual] = useState<string[]>(() => posts.map((p) => p.id));
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [includeBio, setIncludeBio] = useState(true);
  const title = customTitle ?? suggestedTitle ?? '';

  const byId = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const ordered = useMemo(() => {
    const list = posts.slice();
    if (order === 'chronological') return list.sort((a, b) => secs(a.createdAt) - secs(b.createdAt));
    if (order === 'recent') return list.sort((a, b) => secs(b.createdAt) - secs(a.createdAt));
    if (order === 'alphabetical') return list.sort((a, b) => collator.compare(a.title, b.title));
    // Manual keeps the poet's arrangement; new poems join at the end.
    const known = manual.filter((id) => byId.has(id));
    const fresh = posts.filter((p) => !known.includes(p.id)).map((p) => p.id);
    return [...known, ...fresh].map((id) => byId.get(id)!);
  }, [posts, order, manual, byId]);

  const chosen = ordered.filter((p) => selected.has(p.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const move = (id: string, delta: -1 | 1) => {
    const ids = ordered.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setManual(ids);
    setOrder('manual');
  };

  if (posts.length === 0) {
    return (
      <section className={styles.composer} aria-labelledby="poemario-title">
        <h3 id="poemario-title" className={styles.heading}>Poemario en PDF</h3>
        <p className={styles.empty}>Cuando publiques poemas podrás reunirlos aquí en un libro listo para imprimir.</p>
      </section>
    );
  }

  return (
    <section className={styles.composer} aria-labelledby="poemario-title">
      <header className={styles.header}>
        <h3 id="poemario-title" className={styles.heading}>Poemario en PDF</h3>
        <p className={styles.lead}>
          Reúne tus poemas en un libro A5 con portada, índice enlazado, biografía y un QR a tu perfil.
          Listo para enviar a una editorial o imprimir.
        </p>
      </header>

      <div className={styles.controls}>
        <label className={styles.control}>
          <span className={styles.label}>Título de portada</span>
          <input className={styles.input} value={title} maxLength={120}
            onChange={(e) => setCustomTitle(e.target.value)} placeholder={user.username || 'Antología'} />
        </label>
        <label className={styles.control}>
          <span className={styles.label}>Orden</span>
          <select className={styles.select} value={order} onChange={(e) => setOrder(e.target.value as Order)}>
            <option value="chronological">Como los publicaste</option>
            <option value="recent">Más recientes primero</option>
            <option value="alphabetical">Alfabético</option>
            <option value="manual">A mano</option>
          </select>
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={includeBio} onChange={(e) => setIncludeBio(e.target.checked)} />
          <span>Incluir biografía y enlaces</span>
        </label>
      </div>

      <div className={styles.listHeader}>
        <span className={styles.label}>{chosen.length} de {posts.length} poemas</span>
        <span className={styles.bulk}>
          <button type="button" className={styles.textButton} onClick={() => setSelected(new Set(posts.map((p) => p.id)))}>Todos</button>
          <button type="button" className={styles.textButton} onClick={() => setSelected(new Set(posts.filter((p) => p.isVisible !== false).map((p) => p.id)))}>Solo visibles</button>
          <button type="button" className={styles.textButton} onClick={() => setSelected(new Set())}>Ninguno</button>
        </span>
      </div>

      <ol className={styles.list}>
        {ordered.map((p, i) => {
          const on = selected.has(p.id);
          return (
            <li key={p.id} className={styles.item} data-on={on || undefined}>
              <label className={styles.pick}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                <span className={styles.page} aria-hidden="true">{on ? String(chosen.indexOf(p) + 1).padStart(2, '0') : '··'}</span>
                <span className={styles.title}>{p.title}</span>
                {p.isVisible === false && <span className={styles.badge}>oculto</span>}
              </label>
              <span className={styles.moves}>
                <button type="button" className={styles.move} onClick={() => move(p.id, -1)} disabled={i === 0} aria-label={`Subir «${p.title}»`}>↑</button>
                <button type="button" className={styles.move} onClick={() => move(p.id, 1)} disabled={i === ordered.length - 1} aria-label={`Bajar «${p.title}»`}>↓</button>
              </span>
            </li>
          );
        })}
      </ol>

      <BookDownloadButton user={user} posts={chosen} bookTitle={title} includeBio={includeBio} order="given" includeHidden bare />
    </section>
  );
}
