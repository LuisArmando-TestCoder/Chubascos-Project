'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShaderEditor, DEFAULT_SHADER } from '@/components/organisms/ShaderEditor/ShaderEditor';
import { TagExplorer } from '@/components/organisms/TagExplorer/TagExplorer';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import { DropField } from '@/components/atoms/DropField/DropField';
import { createPost, updatePost, createShader, updateShader, softDeleteShader, deletePost } from '@/actions/data';
import { generateSlug } from '@/utils/generateSlug';
import { sanitizeMarkdown } from '@/utils/sanitizeMarkdown';
import { plume } from '@/lib/fluid/bus';
import type { Post, Shader, Tag, User, Book } from '@/types';
import { DashboardPostsList } from '../DashboardPostsList';
import { Stage, StageProgress, type StageMeta } from '../studio/Stage';
import { Field } from '../studio/Field';
import { Choice } from '../studio/Choice';
import { SaveBar, type SaveTone } from '../studio/SaveBar';
import { DangerZone } from '../studio/DangerZone';
import { useLocalDraft, useSaveShortcut, useUnsavedGuard } from '../studio/hooks';
import { poemStats, visibilityOf, flagsFor, type Visibility } from '../studio/text';
import s from '../studio/Studio.module.scss';

const ShaderCanvas = dynamic(() => import('@/components/organisms/ShaderCanvas/ShaderCanvas'), { ssr: false });

const MAX_TAGS = 4;
const MAX_CHARS = 50000;

interface PoemPanelProps {
  user: User;
  posts: Post[];
  books: Book[];
  editPost?: Post | null;
  editShader?: Shader | null;
  prevPost?: Post | null;
  nextPost?: Post | null;
  tags: Tag[];
  tagsLoading: boolean;
  onSaved: () => void;
}

type Draft = { title: string; content: string; tagIds: string[] };

export function PoemPanel({ user, posts, books, editPost, editShader, prevPost, nextPost, tags, tagsLoading, onSaved }: PoemPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editingId = editPost?.id ?? null;

  // What the poem looked like when this form opened: the baseline for "dirty".
  const initial = useMemo(() => ({
    title: editPost?.title ?? '',
    content: editPost?.content ?? '',
    tagIds: editPost?.tagIds ?? [],
    slug: editPost?.slug ?? '',
    visibility: visibilityOf(editPost),
    shader: editShader && !editShader.isDeleted ? editShader.glslCode : '',
  }), [editPost, editShader]);

  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [slug, setSlug] = useState(initial.slug);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
  const [shaderCode, setShaderCode] = useState(initial.shader);
  const [shaderId, setShaderId] = useState<string | null>(editPost?.shaderId ?? null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState(initial.shader || DEFAULT_SHADER);
  const [compileError, setCompileError] = useState<string | null | undefined>(undefined);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<SaveTone>('idle');
  const [savedSlug, setSavedSlug] = useState<string | null>(editPost?.slug ?? null);
  const [baseline, setBaseline] = useState(initial);
  const [touched, setTouched] = useState(false);

  const dirty =
    title !== baseline.title || content !== baseline.content || slug !== baseline.slug ||
    visibility !== baseline.visibility || shaderCode !== baseline.shader ||
    tagIds.join() !== baseline.tagIds.join();
  useUnsavedGuard(dirty && !saving);

  // New poems keep a draft in this browser until they're published.
  const draftValue = useMemo<Draft>(() => ({ title, content, tagIds }), [title, content, tagIds]);
  const draft = useLocalDraft<Draft>(
    editingId ? null : `chubascos:draft:poem:${user.id}`,
    draftValue,
    (d) => !d.title.trim() && !d.content.trim(),
  );

  const stats = poemStats(content);
  const autoSlug = generateSlug(title);
  const titleError = touched && !title.trim() ? 'Tu poema necesita un título.' : null;
  const contentError = touched && !content.trim() ? 'Escribe al menos un verso.' : null;
  const slugError = slug && !/^[a-z0-9-]{3,100}$/.test(slug) ? 'Solo minúsculas, números y guiones (3 a 100).' : null;

  const stages: StageMeta[] = [
    { id: 'poema-titulo', title: 'Título', done: Boolean(title.trim()) },
    { id: 'poema-versos', title: 'Versos', done: Boolean(content.trim()) },
    { id: 'poema-etiquetas', title: 'Etiquetas', done: tagIds.length > 0, optional: true },
    { id: 'poema-alquimia', title: 'Alquimia', done: Boolean(shaderCode), optional: true },
    { id: 'poema-publicacion', title: 'Publicación', done: Boolean(title.trim() && content.trim()) },
  ];
  const missing = [!title.trim() && 'título', !content.trim() && 'versos'].filter(Boolean) as string[];

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_TAGS ? [...prev, id] : prev));

  const fail = (text: string) => { setMessage(text); setTone('error'); };

  /** Create, update or detach the poem's shader. Returns the id to store. */
  const persistShader = useCallback(async (): Promise<{ ok: true; id: string | null } | { ok: false }> => {
    if (shaderCode === baseline.shader) return { ok: true, id: shaderId };
    if (!shaderCode) {
      if (shaderId) await softDeleteShader(user.id, shaderId);
      return { ok: true, id: null };
    }
    const name = title.trim().slice(0, 100) || 'Alquimia';
    if (shaderId) {
      const r = await updateShader(user.id, shaderId, { glslCode: shaderCode, name });
      return r.success ? { ok: true, id: shaderId } : { ok: false };
    }
    const r = await createShader(user.id, { name, glslCode: shaderCode, isPublic: false });
    return r.success && r.id ? { ok: true, id: r.id } : { ok: false };
  }, [shaderCode, baseline.shader, shaderId, title, user.id]);

  const save = useCallback(async () => {
    if (saving) return;
    setTouched(true);
    if (missing.length || slugError) {
      fail(slugError || `Falta: ${missing.join(' y ')}.`);
      return;
    }
    if (editorOpen) {
      fail('Guarda o cierra el editor de alquimia antes de publicar.');
      return;
    }
    setSaving(true);
    setMessage(editingId ? 'Guardando cambios…' : 'Publicando…');
    setTone('idle');
    try {
      const shader = await persistShader();
      if (!shader.ok) {
        fail('No se pudo guardar la alquimia. El poema no se publicó.');
        return;
      }
      setShaderId(shader.id);
      const flags = flagsFor(visibility);
      const payload = {
        title: title.trim(),
        content,
        tagIds,
        ...(slug && slug !== baseline.slug ? { slug } : {}),
        ...flags,
      };

      if (editingId) {
        const r = await updatePost(user.id, editingId, { ...payload, shaderId: shader.id });
        if (!r.success) return fail(r.error || 'No se pudo actualizar el poema.');
        const finalSlug = ('slug' in r && r.slug) || slug || savedSlug;
        setSavedSlug(finalSlug ?? null);
        setSlug(finalSlug ?? '');
        setBaseline({ title: payload.title, content, tagIds, slug: finalSlug ?? '', visibility, shader: shaderCode });
        setTitle(payload.title);
        setMessage('Poema actualizado.');
      } else {
        const r = await createPost(user.id, { ...payload, ...(shader.id ? { shaderId: shader.id } : {}) });
        if (!r.success) return fail(r.error || 'No se pudo publicar el poema.');
        setSavedSlug(('slug' in r && r.slug) || null);
        draft.clear();
        const empty = { title: '', content: '', tagIds: [] as string[], slug: '', visibility: 'public' as Visibility, shader: '' };
        setTitle(''); setContent(''); setTagIds([]); setSlug(''); setVisibility('public');
        setShaderCode(''); setShaderId(null); setPreviewCode(DEFAULT_SHADER); setCompileError(undefined);
        setBaseline(empty);
        setTouched(false);
        setMessage(flags.isVisible ? 'Poema publicado. Ya cae en la lluvia.' : 'Poema guardado como oculto.');
      }
      setTone('ok');
      plume(rootRef.current, 'rain');
      onSaved();
    } catch (err) {
      console.error('save poem', err);
      fail('Algo falló al guardar. Tu texto sigue aquí; inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, missing.length, slugError, editorOpen, editingId, persistShader, visibility, title, content, tagIds, slug, baseline, savedSlug, shaderCode, user.id, onSaved]);

  useSaveShortcut(rootRef, save);

  const handleDelete = async () => {
    if (!editingId) return;
    const r = await deletePost(user.id, editingId);
    if (r.success) window.location.href = '/dashboard?tab=poema';
    else fail(r.error || 'No se pudo eliminar el poema.');
  };

  const restoreDraft = () => {
    if (!draft.restored) return;
    setTitle(draft.restored.title || '');
    setContent(draft.restored.content || '');
    setTagIds(Array.isArray(draft.restored.tagIds) ? draft.restored.tagIds.slice(0, MAX_TAGS) : []);
    draft.dismissRestored();
  };

  const previewHtml = content.trim() ? sanitizeMarkdown(content) : '';
  const livePreviewCode = editorOpen ? previewCode : shaderCode;
  const publicPath = `/u/${encodeURIComponent(user.id)}/p/${savedSlug ?? ''}`;

  return (
    <div ref={rootRef} className={s.panel}>
      <div className={s.split}>
      <div className={s.formCol}>
        <StageProgress stages={stages} label="Pasos del poema" />

        {draft.restored && (
          <div className={s.notice} role="status">
            <span>Encontramos un borrador sin publicar: «{draft.restored.title || 'sin título'}».</span>
            <span className={s.noticeActions}>
              <button type="button" className={s.textButton} onClick={restoreDraft}>Recuperar</button>
              <button type="button" className={s.textButton} onClick={draft.clear}>Descartar</button>
            </span>
          </div>
        )}

        <Stage {...stages[0]} hint="Lo primero que verá quien lo encuentre. También forma la dirección del poema.">
          <Field label="Título" error={titleError} count={title.length} max={200}>
            {(p) => (
              <input {...p} className={`${s.input} ${s.inputTitle}`} value={title} maxLength={200}
                onChange={(e) => setTitle(e.target.value)} placeholder="El nombre de tu poema" autoComplete="off" />
            )}
          </Field>
        </Stage>

        <Stage {...stages[1]} hint={<>Cada salto de línea se respeta. Deja una línea en blanco entre estrofas. Admite <em>*cursiva*</em>, <strong>**negrita**</strong> y <code>&gt; cita</code>.</>}>
          <Field label="Versos" error={contentError} count={content.length} max={MAX_CHARS}>
            {(p) => (
              <textarea {...p} className={`${s.textarea} ${s.textareaVerse}`} value={content} maxLength={MAX_CHARS}
                onChange={(e) => setContent(e.target.value)} placeholder={'Escribe tu poema aquí…\n\nUna línea, un verso.'} rows={14} spellCheck />
            )}
          </Field>
          <dl className={s.readouts} aria-label="Medidas del poema">
            <div><dt>Versos</dt><dd>{stats.verses}</dd></div>
            <div><dt>Estrofas</dt><dd>{stats.stanzas}</dd></div>
            <div><dt>Palabras</dt><dd>{stats.words}</dd></div>
            <div><dt>Lectura</dt><dd>{stats.readingLabel}</dd></div>
          </dl>
          {draft.savedAt && !editingId && <p className={s.hint}>Borrador guardado en este navegador.</p>}
        </Stage>

        <Stage {...stages[2]} hint={`Hasta ${MAX_TAGS}. Ayudan a que lo encuentren en el buscador y a que otras voces afines te descubran.`}>
          {tagsLoading ? (
            <p className={s.hint}>Cargando etiquetas…</p>
          ) : (
            <TagExplorer mode="pick" label="Etiquetas del poema" tags={tags} selectedIds={tagIds} max={MAX_TAGS} onToggle={toggleTag} />
          )}
        </Stage>

        <Stage {...stages[3]} hint="Un shader GLSL que se mueve detrás de tus versos. Lo ves en vivo en la vista previa.">
          {!editorOpen && (
            <div className={s.pillRow}>
              <button type="button" className={s.ghostButton} aria-expanded={editorOpen}
                onClick={() => { setPreviewCode(shaderCode || DEFAULT_SHADER); setEditorOpen(true); }}>
                {shaderCode ? 'Editar alquimia' : 'Añadir alquimia'}
              </button>
              {shaderCode && (
                <button type="button" className={s.textButton} onClick={() => { setShaderCode(''); setCompileError(undefined); }}>
                  Quitar alquimia
                </button>
              )}
            </div>
          )}
          <AnimatePresence initial={false}>
            {editorOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <ShaderEditor
                  initialCode={shaderCode || DEFAULT_SHADER}
                  compileError={compileError}
                  onCodeChange={setPreviewCode}
                  onSave={(code) => { setShaderCode(code); setEditorOpen(false); }}
                  onClose={() => { setEditorOpen(false); setCompileError(undefined); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {shaderCode && !editorOpen && <p className={s.hint}>Alquimia activa. Se guarda junto con el poema.</p>}
        </Stage>

        <Stage {...stages[4]} hint="Decide quién lo lee y si avisamos a quienes te siguen.">
          <Choice<Visibility>
            legend="Visibilidad"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'public', label: 'Público y en portada', description: 'Aparece en la lluvia de inicio y avisa a quienes te siguen.' },
              { value: 'quiet', label: 'Público, en silencio', description: 'Visible en tu perfil y el buscador, sin portada ni avisos.' },
              { value: 'hidden', label: 'Oculto', description: 'Solo tú lo ves aquí, en tu taller.' },
            ]}
          />
          <details className={s.field}>
            <summary className={s.textButton}>Dirección del poema</summary>
            <Field label="Slug" optional error={slugError}
              hint={<>Quedará en <code>…/p/{slug || savedSlug || autoSlug || 'tu-poema'}</code>. Si ya existe, le añadimos un número.</>}>
              {(p) => (
                <input {...p} className={s.input} value={slug} maxLength={100}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder={autoSlug || 'generado-del-titulo'} autoComplete="off" spellCheck={false} />
              )}
            </Field>
          </details>
        </Stage>

        <SaveBar
          label={editingId ? 'Guardar cambios' : flagsFor(visibility).isVisible ? 'Publicar poema' : 'Guardar oculto'}
          onSave={save}
          loading={saving}
          dirty={dirty}
          message={message}
          tone={tone}
          missing={touched ? missing : []}
          aside={savedSlug && !dirty ? <Link href={publicPath} className={s.viewLink}>Ver el poema →</Link> : null}
        />

        {editingId && (nextPost || prevPost) && (
          <nav className={s.editNav} aria-label="Otros poemas">
            {nextPost && <Link href={`/dashboard?edit=post&id=${nextPost.id}`} className={s.editNavLink}>← {nextPost.title}</Link>}
            {prevPost && <Link href={`/dashboard?edit=post&id=${prevPost.id}`} className={`${s.editNavLink} ${s.editNavRight}`}>{prevPost.title} →</Link>}
          </nav>
        )}

        {editingId && <DangerZone label="Eliminar poema" onConfirm={handleDelete} />}
      </div>

      <aside className={s.previewCol} aria-label="Vista previa del poema">
        <div className={s.previewSurface}>
          {livePreviewCode ? (
            <div className={s.previewShader} aria-hidden="true">
              <ShaderCanvas glslCode={livePreviewCode} onError={editorOpen ? setCompileError : undefined} />
            </div>
          ) : (
            <DropField seed={editingId || 'nuevo-poema'} tint="rain" density={0.18} />
          )}
          <span className={s.previewLabel}>Así caerá</span>
          <h3 className={s.previewTitle}><WaterText text={title.trim() || 'Sin título todavía'} /></h3>
          {previewHtml ? (
            <div className={s.previewBody} dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className={s.previewEmpty}>Escribe y aquí verás tu poema como lo leerán.</p>
          )}
          <p className={s.previewMeta}>
            {stats.verses} versos · {stats.words} palabras · {visibility === 'hidden' ? 'oculto' : visibility === 'quiet' ? 'en silencio' : 'en portada'}
          </p>
        </div>
        <DashboardPostsList items={posts} activeId={editingId} type="post" isOwner />
        <DashboardPostsList items={books} type="book" isOwner />
      </aside>
      </div>
    </div>
  );
}
