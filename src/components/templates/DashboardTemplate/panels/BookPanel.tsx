'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { TagExplorer } from '@/components/organisms/TagExplorer/TagExplorer';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import { PoemarioComposer } from '@/components/organisms/PoemarioComposer/PoemarioComposer';
import { DropSigil } from '@/components/atoms/DropSigil/DropSigil';
import { createBook, updateBook, deleteBook } from '@/actions/data';
import { sanitizeMarkdown } from '@/utils/sanitizeMarkdown';
import { plume } from '@/lib/fluid/bus';
import type { Book, Post, Tag, User } from '@/types';
import { DashboardPostsList } from '../DashboardPostsList';
import { Stage, StageProgress, type StageMeta } from '../studio/Stage';
import { Field } from '../studio/Field';
import { Choice } from '../studio/Choice';
import { SaveBar, type SaveTone } from '../studio/SaveBar';
import { DangerZone } from '../studio/DangerZone';
import { useSaveShortcut, useUnsavedGuard } from '../studio/hooks';
import s from '../studio/Studio.module.scss';
import b from './BookPanel.module.scss';

const MAX_TAGS = 4;
const MAX_CHARS = 50000;

interface BookPanelProps {
  user: User;
  books: Book[];
  posts: Post[];
  editBook?: Book | null;
  tags: Tag[];
  tagsLoading: boolean;
  onSaved: () => void;
}

type BookVisibility = 'visible' | 'hidden';

export function BookPanel({ user, books, posts, editBook, tags, tagsLoading, onSaved }: BookPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editingId = editBook?.id ?? null;
  const authorName = user.username || user.email.split('@')[0];

  const initial = useMemo(() => ({
    title: editBook?.title ?? '',
    content: editBook?.content ?? '',
    tagIds: editBook?.tagIds ?? [],
    visibility: (editBook && editBook.isVisible === false ? 'hidden' : 'visible') as BookVisibility,
  }), [editBook]);
  const [baseline, setBaseline] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [visibility, setVisibility] = useState<BookVisibility>(initial.visibility);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<SaveTone>('idle');
  const [touched, setTouched] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(editBook?.slug ?? null);

  const dirty = title !== baseline.title || content !== baseline.content || visibility !== baseline.visibility
    || tagIds.join() !== baseline.tagIds.join();
  useUnsavedGuard(dirty && !saving);

  const stages: StageMeta[] = [
    { id: 'libro-titulo', title: 'Título', done: Boolean(title.trim()) },
    { id: 'libro-ficha', title: 'Ficha', done: Boolean(content.trim()) },
    { id: 'libro-etiquetas', title: 'Etiquetas', done: tagIds.length > 0, optional: true },
    { id: 'libro-visibilidad', title: 'Visibilidad', done: Boolean(title.trim() && content.trim()) },
  ];
  const missing = [!title.trim() && 'título', !content.trim() && 'ficha'].filter(Boolean) as string[];

  const fail = (text: string) => { setMessage(text); setTone('error'); };

  const save = useCallback(async () => {
    if (saving) return;
    setTouched(true);
    if (missing.length) return fail(`Falta: ${missing.join(' y ')}.`);
    setSaving(true);
    setTone('idle');
    setMessage(editingId ? 'Guardando cambios…' : 'Publicando…');
    const payload = { title: title.trim(), content, tagIds, isVisible: visibility === 'visible' };
    try {
      if (editingId) {
        const r = await updateBook(user.id, editingId, payload);
        if (!r.success) return fail(r.error || 'No se pudo actualizar el libro.');
        setBaseline({ title: payload.title, content, tagIds, visibility });
        setTitle(payload.title);
        setMessage('Libro actualizado.');
      } else {
        const r = await createBook(user.id, payload);
        if (!r.success) return fail(r.error || 'No se pudo publicar el libro.');
        setSavedSlug(('slug' in r && r.slug) || null);
        const empty = { title: '', content: '', tagIds: [] as string[], visibility: 'visible' as BookVisibility };
        setTitle(''); setContent(''); setTagIds([]); setVisibility('visible');
        setBaseline(empty);
        setTouched(false);
        setMessage(payload.isVisible ? 'Libro publicado en tu perfil.' : 'Libro guardado como oculto.');
      }
      setTone('ok');
      plume(rootRef.current, 'rain');
      onSaved();
    } catch (err) {
      console.error('save book', err);
      fail('Algo falló al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, missing.length, editingId, title, content, tagIds, visibility, user.id, onSaved]);

  useSaveShortcut(rootRef, save);

  const handleDelete = async () => {
    if (!editingId) return;
    const r = await deleteBook(user.id, editingId);
    if (r.success) window.location.href = '/dashboard?tab=libro';
    else fail(r.error || 'No se pudo eliminar el libro.');
  };

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_TAGS ? [...prev, id] : prev));

  const html = content.trim() ? sanitizeMarkdown(content) : '';
  const coverTitle = title.trim() || 'Título del libro';

  return (
    <div ref={rootRef} className={s.panel}>
      <div className={s.split}>
      <div className={s.formCol}>
        <StageProgress stages={stages} label="Pasos del libro" />

        <Stage {...stages[0]} hint="Un libro que ya existe o que estás preparando. Aparece en tu perfil y en el buscador.">
          <Field label="Título del libro" error={touched && !title.trim() ? 'Ponle un título.' : null} count={title.length} max={200}>
            {(p) => (
              <input {...p} className={`${s.input} ${s.inputTitle}`} value={title} maxLength={200}
                onChange={(e) => setTitle(e.target.value)} placeholder="Charcos de noviembre" autoComplete="off" />
            )}
          </Field>
        </Stage>

        <Stage {...stages[1]} hint={<>Sinopsis, editorial, año, ISBN, dónde comprarlo. Admite Markdown: <code>[tienda](https://…)</code> crea un enlace.</>}>
          <Field label="Ficha" error={touched && !content.trim() ? 'Cuéntanos algo del libro.' : null} count={content.length} max={MAX_CHARS}>
            {(p) => (
              <textarea {...p} className={s.textarea} value={content} rows={10} maxLength={MAX_CHARS}
                onChange={(e) => setContent(e.target.value)}
                placeholder={'Poemas escritos durante la estación lluviosa…\n\nEditorial Aguacero, 2026 · 96 páginas\n[Cómpralo aquí](https://…)'} />
            )}
          </Field>
        </Stage>

        <Stage {...stages[2]} hint={`Hasta ${MAX_TAGS}.`}>
          {tagsLoading ? (
            <p className={s.hint}>Cargando etiquetas…</p>
          ) : (
            <TagExplorer mode="pick" label="Etiquetas del libro" tags={tags} selectedIds={tagIds} max={MAX_TAGS} onToggle={toggleTag} />
          )}
        </Stage>

        <Stage {...stages[3]}>
          <Choice<BookVisibility>
            legend="¿Quién lo ve?"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'visible', label: 'En tu perfil', description: 'Visible para todos y en el buscador. Avisamos a quienes te siguen.' },
              { value: 'hidden', label: 'Oculto', description: 'Guardado en tu taller hasta que esté listo.' },
            ]}
          />
        </Stage>

        <SaveBar
          label={editingId ? 'Guardar cambios' : visibility === 'visible' ? 'Publicar libro' : 'Guardar oculto'}
          onSave={save}
          loading={saving}
          dirty={dirty}
          message={message}
          tone={tone}
          missing={touched ? missing : []}
          aside={savedSlug && !dirty ? <Link href={`/u/${encodeURIComponent(user.id)}/b/${savedSlug}`} className={s.viewLink}>Ver el libro →</Link> : null}
        />

        {editingId && <DangerZone label="Eliminar libro" onConfirm={handleDelete} />}
      </div>

      <aside className={s.previewCol} aria-label="Vista previa del libro">
        <p className={s.previewCaption}>Portada y ficha</p>
        <div className={b.cover} aria-hidden="true">
          <DropSigil name={coverTitle} size={120} className={b.coverSigil} />
          <span className={b.coverTitle}><WaterText text={coverTitle} /></span>
          <span className={b.coverAuthor}>{authorName}</span>
        </div>
        {html ? (
          <div className={s.previewBody} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className={s.previewEmpty}>La ficha aparecerá aquí, tal como en tu perfil.</p>
        )}
        <DashboardPostsList items={books} activeId={editingId} type="book" isOwner />
      </aside>

      </div>

      <div className={s.wide}>
        <PoemarioComposer user={user} posts={posts} suggestedTitle={title.trim() || undefined} />
      </div>
    </div>
  );
}
