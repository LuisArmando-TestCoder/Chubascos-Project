'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { TagExplorer } from '@/components/organisms/TagExplorer/TagExplorer';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import { DropSigil } from '@/components/atoms/DropSigil/DropSigil';
import { TagPill } from '@/components/atoms/TagPill/TagPill';
import { updateUserProfile, checkUsernameAvailable, checkHandleAvailable, changeHandle } from '@/actions/data';
import { handleProblem, normalizeHandle } from '@/lib/handles';
import { USERNAME_RE, isSafeUrl } from '@/utils/validation';
import { useProfileStore } from '@/store/profile';
import { plume } from '@/lib/fluid/bus';
import type { Contact, Tag, User } from '@/types';
import { Stage, StageProgress, type StageMeta } from '../studio/Stage';
import { Field } from '../studio/Field';
import { SaveBar, type SaveTone } from '../studio/SaveBar';
import { useDebounced, useSaveShortcut, useUnsavedGuard } from '../studio/hooks';
import { normalizeLink } from '../studio/text';
import s from '../studio/Studio.module.scss';
import p from './ProfilePanel.module.scss';
import { profilePath } from '@/lib/handles';

const MAX_TAGS = 10;
const MAX_LINKS = 5;
const MAX_BIO = 500;

interface ProfilePanelProps {
  user: User;
  tags: Tag[];
  tagsLoading: boolean;
  onSaved: () => void;
}

type NameCheck = { state: 'idle' | 'checking' | 'ok' | 'taken'; reason?: string };

function localNameProblem(name: string): string | null {
  const v = name.trim();
  if (!v) return null; // empty keeps the email-based fallback
  if (v.length < 3) return 'Al menos 3 caracteres.';
  if (v.length > 32) return 'Hasta 32 caracteres.';
  if (!USERNAME_RE.test(v)) return 'Sin espacios ni símbolos (solo . _ -).';
  return null;
}

export function ProfilePanel({ user, tags, tagsLoading, onSaved }: ProfilePanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { setProfile } = useProfileStore();
  // Unnamed poets sign with their handle (never with their email).
  const fallbackName = user.handle || 'poeta';

  const initial = useMemo(() => ({
    username: user.username ?? '',
    bio: user.bio ?? '',
    contacts: (user.contacts ?? []).map((c) => ({ ...c })),
    tagIds: user.tagIds ?? [],
  }), [user]);
  const [baseline, setBaseline] = useState(initial);
  const [username, setUsername] = useState(initial.username);
  const [bio, setBio] = useState(initial.bio);
  const [contacts, setContacts] = useState<Contact[]>(initial.contacts);
  const [tagIds, setTagIds] = useState<string[]>(initial.tagIds);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<SaveTone>('idle');
  const [touched, setTouched] = useState(false);

  // The header shows the name as it's typed.
  useEffect(() => { setProfile({ username: username.trim() }); }, [username, setProfile]);

  // ── Live username check ───────────────────────────────────────────────────
  const settledName = useDebounced(username.trim(), 450);
  const [nameCheck, setNameCheck] = useState<NameCheck>({ state: 'idle' });
  useEffect(() => {
    if (!settledName || settledName === baseline.username || localNameProblem(settledName)) {
      setNameCheck({ state: 'idle' });
      return;
    }
    let live = true;
    setNameCheck({ state: 'checking' });
    checkUsernameAvailable(user.id, settledName)
      .then((r) => { if (live) setNameCheck(r.available ? { state: 'ok' } : { state: 'taken', reason: r.reason }); })
      .catch(() => { if (live) setNameCheck({ state: 'idle' }); });
    return () => { live = false; };
  }, [settledName, baseline.username, user.id]);

  const nameError = localNameProblem(username) || (nameCheck.state === 'taken' ? nameCheck.reason || 'Ese nombre ya está en uso.' : null);
  const nameHint = nameCheck.state === 'checking' ? 'Comprobando…'
    : nameCheck.state === 'ok' ? 'Disponible.'
    : `Letras, números, punto, guion o guion bajo. Si lo dejas vacío firmas como «${fallbackName}».`;

  const contactErrors = contacts.map((c) => {
    if (!c.label.trim() && !c.url.trim()) return null;
    if (!c.label.trim()) return 'Ponle un nombre (Instagram, web…).';
    if (!isSafeUrl(normalizeLink(c.url))) return 'Enlace no válido.';
    return null;
  });

  // ── Handle: the public address. Stable; changing it is deliberate. ──────
  const [savedHandle, setSavedHandle] = useState(user.handle ?? '');
  const [handle, setHandle] = useState(user.handle ?? '');
  const [handleConfirmed, setHandleConfirmed] = useState(false);
  const handleChanged = handle !== savedHandle;
  const settledHandle = useDebounced(handle, 450);
  const [handleCheck, setHandleCheck] = useState<NameCheck>({ state: 'idle' });
  useEffect(() => {
    if (!settledHandle || settledHandle === savedHandle || handleProblem(settledHandle)) {
      setHandleCheck({ state: 'idle' });
      return;
    }
    let live = true;
    setHandleCheck({ state: 'checking' });
    checkHandleAvailable(user.id, settledHandle)
      .then((r) => { if (live) setHandleCheck(r.available ? { state: 'ok' } : { state: 'taken', reason: r.reason }); })
      .catch(() => { if (live) setHandleCheck({ state: 'idle' }); });
    return () => { live = false; };
  }, [settledHandle, savedHandle, user.id]);
  const handleError = handleChanged
    ? handleProblem(handle) || (handleCheck.state === 'taken' ? handleCheck.reason || 'Esa dirección ya tiene dueño.' : null)
    : null;
  const needsHandleConfirm = handleChanged && Boolean(savedHandle) && !handleError;

  const dirty = handleChanged || username !== baseline.username || bio !== baseline.bio
    || JSON.stringify(contacts) !== JSON.stringify(baseline.contacts) || tagIds.join() !== baseline.tagIds.join();
  useUnsavedGuard(dirty && !saving);

  const stages: StageMeta[] = [
    { id: 'perfil-nombre', title: 'Nombre', done: Boolean(username.trim()) && !nameError },
    { id: 'perfil-direccion', title: 'Dirección', done: Boolean(handle) && !handleError && (!needsHandleConfirm || handleConfirmed) },
    { id: 'perfil-bio', title: 'Biografía', done: Boolean(bio.trim()) },
    { id: 'perfil-enlaces', title: 'Enlaces', done: contacts.some((c) => c.url.trim()) && !contactErrors.some(Boolean), optional: true },
    { id: 'perfil-etiquetas', title: 'Etiquetas', done: tagIds.length > 0, optional: true },
  ];
  const blocking = Boolean(nameError) || Boolean(handleError) || contactErrors.some(Boolean) || bio.length > MAX_BIO
    || nameCheck.state === 'checking' || (handleChanged && handleCheck.state === 'checking')
    || (needsHandleConfirm && !handleConfirmed);

  const fail = (text: string) => { setMessage(text); setTone('error'); };

  const save = useCallback(async () => {
    if (saving) return;
    setTouched(true);
    if (blocking) {
      fail(
        nameCheck.state === 'checking' || handleCheck.state === 'checking' ? 'Esperando la comprobación…'
        : needsHandleConfirm && !handleConfirmed ? 'Confirma que quieres cambiar tu dirección.'
        : 'Revisa los campos marcados.'
      );
      return;
    }
    setSaving(true);
    setTone('idle');
    setMessage('Guardando…');
    const cleanContacts = contacts
      .filter((c) => c.label.trim() || c.url.trim())
      .map((c) => ({ label: c.label.trim(), url: normalizeLink(c.url) }));
    try {
      // The address first: if it fails, nothing else changes.
      if (handleChanged) {
        const h = await changeHandle(user.id, handle);
        if (!h.success) return fail(h.error);
        setSavedHandle(h.handle);
        setHandle(h.handle);
        setHandleConfirmed(false);
      }
      const r = await updateUserProfile(user.id, {
        ...(username.trim() ? { username: username.trim() } : {}),
        bio,
        contacts: cleanContacts,
        tagIds,
      });
      if (!r.success) return fail(r.error || 'No se pudo guardar tu perfil.');
      const next = { username: username.trim(), bio: bio.trim(), contacts: cleanContacts, tagIds };
      setUsername(next.username);
      setBio(next.bio);
      setContacts(cleanContacts);
      setBaseline(next);
      setMessage('Perfil guardado.');
      setTone('ok');
      plume(rootRef.current, 'rain');
      onSaved();
    } catch (err) {
      console.error('save profile', err);
      fail('Algo falló al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [saving, blocking, nameCheck.state, handleCheck.state, handleChanged, handle, needsHandleConfirm, handleConfirmed, contacts, user.id, username, bio, tagIds, onSaved]);

  useSaveShortcut(rootRef, save);

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_TAGS ? [...prev, id] : prev));
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const shownName = username.trim() || fallbackName;

  return (
    <div ref={rootRef} className={s.panel}>
      <div className={s.split}>
      <div className={s.formCol}>
        <StageProgress stages={stages} label="Pasos del perfil" />

        <Stage {...stages[0]} hint="Cómo te firmas. Aparece en tus poemas, tus eventos y la portada de tu poemario.">
          <Field label="Nombre de usuario" error={touched || username ? nameError : null} hint={nameHint} count={username.length} max={32}>
            {(f) => (
              <input {...f} className={`${s.input} ${s.inputTitle}`} value={username} maxLength={32}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                placeholder={fallbackName} autoComplete="nickname" spellCheck={false} />
            )}
          </Field>
        </Stage>

        <Stage {...stages[1]} hint="Tu dirección pública: es lo que se ve en cada enlace que compartes. No cambia cuando cambias tu nombre.">
          <Field
            label="Dirección"
            error={handleError}
            hint={handleChanged && handleCheck.state === 'checking' ? 'Comprobando…'
              : handleChanged && handleCheck.state === 'ok' ? 'Disponible.'
              : <>Tus enlaces: <code>chubascos/u/{handle || 'tu-direccion'}</code></>}
            count={handle.length}
            max={30}
          >
            {(f) => (
              <input {...f} className={s.input} value={handle} maxLength={30} spellCheck={false} autoComplete="off"
                onChange={(e) => { setHandle(normalizeHandle(e.target.value)); setHandleConfirmed(false); }}
                onBlur={() => setHandle((h) => h.replace(/-+$/, ''))}
                placeholder="tu-direccion" />
            )}
          </Field>
          {needsHandleConfirm && (
            <div className={s.notice} role="alert">
              <span>
                Los enlaces que ya compartiste con <code>/u/{savedHandle}</code> dejarán de funcionar,
                y <code>{savedHandle}</code> quedará libre para otra persona. Los enlaces viejos con tu correo seguirán
                llevando a tu perfil nuevo.
              </span>
              <label className={s.textButton} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', textTransform: 'none', letterSpacing: 0 }}>
                <input type="checkbox" checked={handleConfirmed} onChange={(e) => setHandleConfirmed(e.target.checked)} />
                Entiendo, cambiar a «{handle}»
              </label>
              <button type="button" className={s.textButton} onClick={() => { setHandle(savedHandle); setHandleConfirmed(false); }}>
                Mantener «{savedHandle}»
              </button>
            </div>
          )}
        </Stage>

        <Stage {...stages[2]} hint="Unas líneas sobre ti. Se imprime también en la primera página de tu poemario en PDF.">
          <Field label="Biografía" count={bio.length} max={MAX_BIO} error={bio.length > MAX_BIO ? 'Demasiado larga.' : null}>
            {(f) => (
              <textarea {...f} className={s.textarea} value={bio} rows={6} maxLength={MAX_BIO}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Escribo cuando llueve. Vivo en San José. Publiqué «Charcos» (2024)…" />
            )}
          </Field>
        </Stage>

        <Stage {...stages[3]} hint={`Hasta ${MAX_LINKS}: redes, web, correo o teléfono. Escribe «instagram.com/tu-nombre»; nosotros completamos el resto.`}>
          {contacts.map((c, i) => (
            <div key={i} className={p.contactRow}>
              <Field label="Nombre">
                {(f) => (
                  <input {...f} className={s.input} value={c.label} maxLength={50} placeholder="Instagram"
                    onChange={(e) => setContacts((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                )}
              </Field>
              <Field label="Enlace" error={contactErrors[i]}>
                {(f) => (
                  <input {...f} className={s.input} value={c.url} maxLength={500} inputMode="url" placeholder="instagram.com/tu-nombre"
                    onChange={(e) => setContacts((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                    onBlur={() => setContacts((prev) => prev.map((x, j) => (j === i ? { ...x, url: normalizeLink(x.url) } : x)))} />
                )}
              </Field>
              <button type="button" className={s.textButton} aria-label={`Quitar enlace ${i + 1}`}
                onClick={() => setContacts((prev) => prev.filter((_, j) => j !== i))}>Quitar</button>
            </div>
          ))}
          {contacts.length < MAX_LINKS && (
            <div>
              <button type="button" className={s.ghostButton} onClick={() => setContacts((prev) => [...prev, { label: '', url: '' }])}>
                + Añadir enlace
              </button>
            </div>
          )}
        </Stage>

        <Stage {...stages[4]} hint={`Hasta ${MAX_TAGS}. Te ubican en «Poetas» del buscador y conectan tu voz con otras afines.`}>
          {tagsLoading ? (
            <p className={s.hint}>Cargando etiquetas…</p>
          ) : (
            <TagExplorer mode="pick" label="Etiquetas de tu perfil" tags={tags} selectedIds={tagIds} max={MAX_TAGS} onToggle={toggleTag} />
          )}
        </Stage>

        <SaveBar
          label="Guardar perfil"
          onSave={save}
          loading={saving}
          dirty={dirty}
          message={message}
          tone={tone}
          aside={!dirty ? <Link href={profilePath(savedHandle || user.id)} className={s.viewLink}>Ver perfil público →</Link> : null}
        />
      </div>

      <aside className={s.previewCol} aria-label="Vista previa de tu perfil">
        <p className={s.previewCaption}>Así te verán</p>
        <div className={p.card}>
          <DropSigil name={shownName} size={96} className={p.sigil} glyph={shownName.slice(0, 1).toUpperCase()} />
          <h3 className={p.name}><WaterText text={shownName} /></h3>
          {bio.trim() ? <p className={p.bio}>{bio.trim()}</p> : <p className={s.previewEmpty}>Tu biografía aparecerá aquí.</p>}
          {contacts.some((c) => c.url.trim()) && (
            <ul className={p.links}>
              {contacts.filter((c) => c.url.trim()).map((c, i) => (
                <li key={i}><span className={p.linkLabel}>{c.label || 'Enlace'}</span><span className={p.linkUrl}>{normalizeLink(c.url).replace(/^(https?:\/\/|mailto:|tel:)/, '')}</span></li>
              ))}
            </ul>
          )}
          {tagIds.length > 0 && (
            <div className={p.tags}>
              {tagIds.map((id) => tagById.get(id)).filter(Boolean).map((t) => (
                <TagPill key={t!.id} value={t!.value} tagId={t!.id} size="sm" />
              ))}
            </div>
          )}
        </div>
      </aside>
      </div>
    </div>
  );
}
