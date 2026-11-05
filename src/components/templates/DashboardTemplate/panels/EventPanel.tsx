'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { EventCard } from '@/components/molecules/EventCard/EventCard';
import { CronScheduleInput } from '@/components/molecules/CronScheduleInput/CronScheduleInput';
import { TagExplorer } from '@/components/organisms/TagExplorer/TagExplorer';
import { createEvent, updateEvent, deleteEvent } from '@/actions/data';
import { buildMultiNthWeekdayCron, dateToCron, listOccurrences, parseMultiNthWeekdayCron } from '@/utils/cronUtils';
import {
  DEFAULT_EVENT_TIME_ZONE, EVENT_GRACE_MS, browserTimeZone, eventDateString, eventInstant, formatInstant,
  isDateString, isTimeString, isValidTimeZone, todayIn,
} from '@/utils/eventTime';
import { isSafeUrl } from '@/utils/validation';
import { plume } from '@/lib/fluid/bus';
import type { Event, Tag, User } from '@/types';
import { DashboardEventsList } from '../DashboardEventsList';
import { Stage, StageProgress, type StageMeta } from '../studio/Stage';
import { Field } from '../studio/Field';
import { Choice } from '../studio/Choice';
import { SaveBar, type SaveTone } from '../studio/SaveBar';
import { DangerZone } from '../studio/DangerZone';
import { useSaveShortcut, useUnsavedGuard } from '../studio/hooks';
import { normalizeLink } from '../studio/text';
import s from '../studio/Studio.module.scss';

const MAX_TAGS = 4;
const MAX_LINKS = 5;

type Frequency = 'once' | 'weekly' | 'monthly';
type PriceMode = 'unset' | 'free' | 'paid';

interface EventPanelProps {
  user: User;
  events: Event[];
  editEvent?: Event | null;
  prevEvent?: Event | null;
  nextEvent?: Event | null;
  tags: Tag[];
  tagsLoading: boolean;
  onSaved: () => void;
}

interface FormState {
  title: string;
  description: string;
  frequency: Frequency;
  date: string;
  hour: string;
  cron: string;
  place: string;
  priceMode: PriceMode;
  price: string;
  urls: string[];
  tagIds: string[];
}

function frequencyOf(e?: Event | null): Frequency {
  if (!e?.isRecurring || !e.cronExpression) return 'once';
  return parseMultiNthWeekdayCron(e.cronExpression) ? 'monthly' : 'weekly';
}

function formFrom(e: Event | null | undefined, today: string, copy = false): FormState {
  return {
    title: e?.title ?? '',
    description: e?.description ?? '',
    frequency: frequencyOf(e),
    // A copy keeps everything but the date: it happens again, later.
    date: e && !copy ? eventDateString(e) : e?.isRecurring ? today : '',
    hour: e?.hour && isTimeString(e.hour) ? e.hour : '',
    cron: e?.isRecurring ? e.cronExpression ?? '' : '',
    place: e?.place ?? '',
    priceMode: e?.price === undefined || e?.price === null ? 'unset' : e.price === 0 ? 'free' : 'paid',
    price: e?.price ? String(e.price) : '',
    urls: e?.urls?.length ? [...e.urls] : [],
    tagIds: e?.tagIds ?? [],
  };
}

const same = (a: FormState, b: FormState) => JSON.stringify(a) === JSON.stringify(b);

export function EventPanel({ user, events, editEvent, prevEvent, nextEvent, tags, tagsLoading, onSaved }: EventPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(editEvent?.id ?? null);
  const [timeZone] = useState(() =>
    editEvent && isValidTimeZone(editEvent.timeZone) ? editEvent.timeZone : editEvent ? DEFAULT_EVENT_TIME_ZONE : browserTimeZone());
  const today = todayIn(timeZone);

  const [form, setForm] = useState<FormState>(() => formFrom(editEvent, today));
  const [baseline, setBaseline] = useState<FormState>(form);
  const [cronKey, setCronKey] = useState(0); // remounts the schedule picker on copy/reset
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<SaveTone>('idle');
  const [savedId, setSavedId] = useState<string | null>(editEvent?.id ?? null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const dirty = !same(form, baseline);
  useUnsavedGuard(dirty && !saving);

  const recurring = form.frequency !== 'once';

  // ── Derived schedule ──────────────────────────────────────────────────────
  const startInstant = isDateString(form.date) && isTimeString(form.hour) ? eventInstant(form.date, form.hour, timeZone) : null;
  const occurrences = useMemo(() => {
    if (!recurring) return startInstant ? [startInstant] : [];
    if (!form.cron) return [];
    const from = new Date(Math.max((startInstant?.getTime() ?? Date.now()) - 60_000, Date.now() - EVENT_GRACE_MS));
    return listOccurrences(form.cron, 6, from, timeZone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, form.cron, startInstant?.getTime(), timeZone]);

  // ── Validation (shown once the poet tries to save, or as they fix it) ────
  const errors = {
    title: !form.title.trim() ? 'Ponle un nombre al evento.' : null,
    hour: !isTimeString(form.hour) ? 'Elige una hora.' : null,
    date: !recurring && !isDateString(form.date)
      ? 'Elige el día.'
      : !recurring && !editingId && startInstant && startInstant.getTime() + EVENT_GRACE_MS < Date.now()
        ? 'Esa fecha ya pasó.'
        : null,
    cron: recurring && !form.cron ? (form.frequency === 'weekly' ? 'Elige al menos un día de la semana.' : 'Elige al menos una semana del mes.') : null,
    place: !form.place.trim() ? '¿Dónde será?' : null,
    price: form.priceMode === 'paid' && !(Number(form.price) > 0) ? 'Escribe el precio, o marca «Gratis».' : null,
    urls: form.urls.map((u) => (u.trim() && !isSafeUrl(normalizeLink(u)) ? 'Enlace no válido.' : null)),
  };
  const show = (e: string | null) => (touched ? e : null);

  const stages: StageMeta[] = [
    { id: 'evento-que', title: 'Qué', done: !errors.title },
    { id: 'evento-cuando', title: 'Cuándo', done: !errors.hour && !errors.date && !errors.cron },
    { id: 'evento-donde', title: 'Dónde', done: !errors.place && !errors.price && !errors.urls.some(Boolean) },
    { id: 'evento-etiquetas', title: 'Etiquetas', done: form.tagIds.length > 0, optional: true },
  ];
  const missing = [
    errors.title && 'nombre',
    (errors.hour || errors.date || errors.cron) && 'fecha y hora',
    (errors.place || errors.price) && 'lugar',
  ].filter(Boolean) as string[];
  const hasErrors = missing.length > 0 || errors.urls.some(Boolean);

  // ── Frequency switch: carry the chosen date into the pattern ──────────────
  const changeFrequency = (next: Frequency) => {
    setForm((f) => {
      if (next === 'once') return { ...f, frequency: next, cron: '' };
      let cron = f.frequency !== 'once' ? f.cron : '';
      if (!cron && isDateString(f.date) && isTimeString(f.hour)) {
        const d = new Date(`${f.date}T12:00:00Z`);
        cron = next === 'weekly'
          ? dateToCron(f.date, f.hour)
          : buildMultiNthWeekdayCron([Math.min(4, Math.ceil(d.getUTCDate() / 7))], d.getUTCDay(), f.hour);
      }
      return { ...f, frequency: next, cron, date: f.date || today };
    });
    if (form.frequency === 'once') setCronKey((k) => k + 1);
  };

  const toggleTag = (id: string) =>
    set('tagIds', form.tagIds.includes(id) ? form.tagIds.filter((x) => x !== id) : form.tagIds.length < MAX_TAGS ? [...form.tagIds, id] : form.tagIds);

  const fail = (text: string) => { setMessage(text); setTone('error'); };

  const save = useCallback(async () => {
    if (saving) return;
    setTouched(true);
    if (hasErrors || !startInstant) {
      fail(missing.length ? `Falta: ${missing.join(', ')}.` : 'Revisa los campos marcados.');
      return;
    }
    setSaving(true);
    setTone('idle');
    setMessage(editingId ? 'Guardando cambios…' : 'Convocando…');
    const urls = form.urls.map((u) => normalizeLink(u)).filter(Boolean);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      day: startInstant,
      hour: form.hour,
      place: form.place.trim(),
      price: form.priceMode === 'unset' ? null : form.priceMode === 'free' ? 0 : Number(form.price),
      urls,
      tagIds: form.tagIds,
      isRecurring: recurring,
      ...(recurring ? { cronExpression: form.cron } : {}),
      timeZone,
    };
    try {
      if (editingId) {
        const r = await updateEvent(user.id, editingId, payload);
        if (!r.success) return fail(r.error || 'No se pudo actualizar el evento.');
        const next = { ...form, urls };
        setForm(next);
        setBaseline(next);
        setMessage('Evento actualizado.');
      } else {
        const r = await createEvent(user.id, { ...payload, price: payload.price ?? undefined, contacts: [] });
        if (!r.success) return fail(r.error || 'No se pudo crear el evento.');
        setSavedId(('id' in r && r.id) || null);
        const empty = formFrom(null, todayIn(timeZone));
        setForm(empty);
        setBaseline(empty);
        setCronKey((k) => k + 1);
        setTouched(false);
        setMessage(recurring ? 'Evento recurrente creado. Ya aparece su próxima fecha.' : 'Evento creado.');
      }
      setTone('ok');
      plume(rootRef.current, 'puddle');
      onSaved();
    } catch (err) {
      console.error('save event', err);
      fail('Algo falló al guardar. Tus datos siguen aquí; inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, hasErrors, startInstant, editingId, form, recurring, timeZone, user.id, onSaved]);

  useSaveShortcut(rootRef, save);

  const duplicate = (e: Event) => {
    if (dirty && !window.confirm('Tienes cambios sin guardar en este evento. ¿Descartarlos y repetir el otro?')) return;
    const next = formFrom(e, today, true);
    setEditingId(null);
    setSavedId(null);
    setForm(next);
    setBaseline(formFrom(null, today));
    setCronKey((k) => k + 1);
    setTouched(false);
    setMessage(`Copiamos «${e.title}». Elige la nueva fecha.`);
    setTone('idle');
    try { window.history.replaceState(null, '', '/dashboard?tab=evento'); } catch { /* ignore */ }
    document.getElementById('evento-cuando')?.scrollIntoView({ block: 'start' });
  };

  const handleDelete = async () => {
    if (!editingId) return;
    const r = await deleteEvent(user.id, editingId);
    if (r.success) window.location.href = '/dashboard?tab=evento';
    else fail(r.error || 'No se pudo eliminar el evento.');
  };

  // ── Live card preview (a synthetic event, never saved) ────────────────────
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const previewDay = occurrences[0] ?? startInstant;
  const preview: Event = {
    id: editingId || 'vista-previa',
    ownerUserId: user.id,
    title: form.title.trim() || 'Tu evento',
    description: form.description,
    day: previewDay ? { seconds: Math.floor(previewDay.getTime() / 1000), nanoseconds: 0 } : null,
    hour: (previewDay && formatInstant(previewDay, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })) || form.hour || '--:--',
    place: form.place || 'Lugar por definir',
    price: form.priceMode === 'unset' ? undefined : form.priceMode === 'free' ? 0 : Number(form.price) || 0,
    urls: [],
    contacts: [],
    tagIds: form.tagIds,
    isRecurring: recurring && Boolean(form.cron),
    cronExpression: form.cron || undefined,
    timeZone,
    createdAt: null,
    updatedAt: null,
  };

  return (
    <div ref={rootRef} className={s.panel}>
      <div className={s.formCol}>
        <StageProgress stages={stages} label="Pasos del evento" />

        <Stage {...stages[0]} hint="El nombre y una invitación breve: quién lee, qué se escucha, cómo participar.">
          <Field label="Nombre del evento" error={show(errors.title)} count={form.title.length} max={200}>
            {(p) => (
              <input {...p} className={`${s.input} ${s.inputTitle}`} value={form.title} maxLength={200}
                onChange={(e) => set('title', e.target.value)} placeholder="Noche de poemas bajo la lluvia" autoComplete="off" />
            )}
          </Field>
          <Field label="Descripción" optional count={form.description.length} max={2000}>
            {(p) => (
              <textarea {...p} className={s.textarea} value={form.description} maxLength={2000} rows={5}
                onChange={(e) => set('description', e.target.value)} placeholder="Micrófono abierto, lectura de invitados, trae tu cuaderno…" />
            )}
          </Field>
        </Stage>

        <Stage {...stages[1]} hint={<>Las horas se guardan en la hora local del lugar ({timeZone.replace(/_/g, ' ')}).</>}>
          <Choice<Frequency>
            legend="Frecuencia"
            variant="segmented"
            value={form.frequency}
            onChange={changeFrequency}
            options={[
              { value: 'once', label: 'Una vez' },
              { value: 'weekly', label: 'Cada semana' },
              { value: 'monthly', label: 'Cada mes' },
            ]}
          />
          <div className={s.row}>
            <Field label={recurring ? 'Desde' : 'Día'} error={show(errors.date)} hint={recurring ? 'La primera fecha posible.' : undefined}>
              {(p) => (
                <input {...p} type="date" className={s.input} value={form.date}
                  min={editingId ? undefined : today} onChange={(e) => set('date', e.target.value)} />
              )}
            </Field>
            <Field label="Hora" error={show(errors.hour)}>
              {(p) => <input {...p} type="time" className={s.input} value={form.hour} onChange={(e) => set('hour', e.target.value)} />}
            </Field>
          </div>
          {recurring && (
            <>
              <CronScheduleInput
                key={cronKey}
                compact
                hideTime
                mode={form.frequency === 'monthly' ? 'monthly' : 'weekly'}
                time={form.hour}
                value={form.cron}
                onChange={(cron) => set('cron', cron)}
              />
              {show(errors.cron) && <p className={s.error}>{errors.cron}</p>}
            </>
          )}
        </Stage>

        <Stage {...stages[2]} hint="Dirección o referencia que alguien de fuera pueda seguir.">
          <Field label="Lugar" error={show(errors.place)} count={form.place.length} max={200}>
            {(p) => (
              <input {...p} className={s.input} value={form.place} maxLength={200}
                onChange={(e) => set('place', e.target.value)} placeholder="Café Lluvia, Barrio Escalante, San José" />
            )}
          </Field>
          <Choice<PriceMode>
            legend="Entrada"
            variant="segmented"
            value={form.priceMode}
            onChange={(v) => set('priceMode', v)}
            options={[
              { value: 'unset', label: 'Sin indicar' },
              { value: 'free', label: 'Gratis' },
              { value: 'paid', label: 'Con costo' },
            ]}
          />
          {form.priceMode === 'paid' && (
            <Field label="Precio (₡)" error={show(errors.price)}>
              {(p) => (
                <input {...p} type="number" inputMode="numeric" min={1} step={100} className={s.input}
                  value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="3000" />
              )}
            </Field>
          )}
          <fieldset className={s.field} style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className={s.label}>Enlaces <span className={s.optional}>· opcional</span></legend>
            {form.urls.map((url, i) => (
              <div key={i} className={s.row} style={{ gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'end' }}>
                <Field label={`Enlace ${i + 1}`} error={errors.urls[i]}>
                  {(p) => (
                    <input {...p} type="url" inputMode="url" className={s.input} value={url}
                      onChange={(e) => set('urls', form.urls.map((u, j) => (j === i ? e.target.value : u)))}
                      onBlur={() => set('urls', form.urls.map((u, j) => (j === i ? normalizeLink(u) : u)))}
                      placeholder="instagram.com/tu-evento" />
                  )}
                </Field>
                <button type="button" className={s.textButton} onClick={() => set('urls', form.urls.filter((_, j) => j !== i))}
                  aria-label={`Quitar enlace ${i + 1}`}>Quitar</button>
              </div>
            ))}
            {form.urls.length < MAX_LINKS && (
              <div><button type="button" className={s.ghostButton} onClick={() => set('urls', [...form.urls, ''])}>+ Añadir enlace</button></div>
            )}
          </fieldset>
        </Stage>

        <Stage {...stages[3]} hint={`Hasta ${MAX_TAGS}. Así lo encuentran quienes buscan ese tipo de noche.`}>
          {tagsLoading ? (
            <p className={s.hint}>Cargando etiquetas…</p>
          ) : (
            <TagExplorer mode="pick" label="Etiquetas del evento" tags={tags} selectedIds={form.tagIds} max={MAX_TAGS} onToggle={toggleTag} />
          )}
        </Stage>

        <SaveBar
          label={editingId ? 'Guardar cambios' : 'Crear evento'}
          onSave={save}
          loading={saving}
          dirty={dirty}
          message={message}
          tone={tone}
          missing={touched ? missing : []}
          aside={savedId && !dirty ? <Link href={`/e/${encodeURIComponent(savedId)}`} className={s.viewLink}>Ver evento →</Link> : null}
        />

        {editingId && (nextEvent || prevEvent) && (
          <nav className={s.editNav} aria-label="Otros eventos">
            {prevEvent && <Link href={`/dashboard?edit=event&id=${prevEvent.id}`} className={s.editNavLink}>← {prevEvent.title}</Link>}
            {nextEvent && <Link href={`/dashboard?edit=event&id=${nextEvent.id}`} className={`${s.editNavLink} ${s.editNavRight}`}>{nextEvent.title} →</Link>}
          </nav>
        )}

        {editingId && <DangerZone label="Cancelar y eliminar evento" onConfirm={handleDelete} />}
      </div>

      <aside className={s.previewCol} aria-label="Vista previa del evento">
        <div>
          <p className={s.previewCaption}>Así se verá en la cartelera</p>
          <div inert>
            <EventCard event={preview} tags={form.tagIds.map((id) => tagById.get(id)).filter(Boolean) as Tag[]} />
          </div>
        </div>
        <div>
          <p className={s.previewCaption}>{recurring ? 'Próximas fechas' : 'Fecha'}</p>
          {occurrences.length ? (
            <ol className={s.timeline}>
              {occurrences.map((d, i) => (
                <li key={d.getTime()} data-first={i === 0 || undefined}>
                  <span className={s.timelineDate}>{formatInstant(d, timeZone, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <span className={s.timelineHour}>{formatInstant(d, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={s.previewEmpty}>{recurring ? 'Elige días y hora para ver cuándo se repite.' : 'Elige el día y la hora.'}</p>
          )}
        </div>
      </aside>

      <div className={s.wide}>
        <DashboardEventsList events={events} activeId={editingId} onDuplicate={duplicate} />
      </div>
    </div>
  );
}
