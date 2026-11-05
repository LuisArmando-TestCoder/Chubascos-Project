// Event time lives in the place where the event happens, not on the server.
//
// An event stores:
//   - `day`: the real instant it starts (Firestore Timestamp)
//   - `hour`: the wall-clock "HH:MM" people read on the poster
//   - `timeZone`: the IANA zone of the venue (e.g. America/Costa_Rica)
//
// Events saved before `timeZone` existed stored `day` as UTC midnight of the
// chosen date (`new Date("YYYY-MM-DD")`), with the hour kept apart. Those are
// read in UTC to recover the date the poet picked, and their start instant is
// rebuilt from date + hour in the default zone.

import type { Event } from '@/types';

export const DEFAULT_EVENT_TIME_ZONE = 'America/Costa_Rica';
export const LEGACY_EVENT_TIME_ZONE = 'UTC';

/** An event stays "upcoming" for this long after it starts (it's happening). */
export const EVENT_GRACE_MS = 2 * 60 * 60 * 1000;

export interface WallClock {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function browserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(tz) ? tz : DEFAULT_EVENT_TIME_ZONE;
  } catch {
    return DEFAULT_EVENT_TIME_ZONE;
  }
}

export function isDateString(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function isTimeString(s: unknown): s is string {
  return typeof s === 'string' && TIME_RE.test(s);
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(tz, f);
  }
  return f;
}

/** The wall clock an instant shows in a zone. */
export function wallClockIn(instant: Date, tz: string): WallClock & { second: number } {
  const out: Record<string, number> = {};
  for (const p of partsFormatter(tz).formatToParts(instant)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

function offsetMs(instantMs: number, tz: string): number {
  const w = wallClockIn(new Date(instantMs), tz);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

/**
 * The instant at which a zone's wall clock reads `wall`. Two passes settle
 * DST edges: a skipped hour resolves forward, a repeated hour to its first.
 */
export function zonedToInstant(wall: WallClock, tz: string): Date {
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const first = naive - offsetMs(naive, tz);
  const second = naive - offsetMs(first, tz);
  const matches = (ms: number) => {
    const w = wallClockIn(new Date(ms), tz);
    return w.hour === wall.hour && w.minute === wall.minute && w.day === wall.day;
  };
  if (matches(second)) return new Date(second);
  if (matches(first)) return new Date(first);
  // The wall time falls in a DST gap and doesn't exist: move forward past it.
  return new Date(Math.max(first, second));
}

/** "2026-11-05" + "19:30" in a zone → the instant it starts. */
export function eventInstant(dateStr: string, timeStr: string, tz: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = (timeStr || '00:00').split(':').map(Number);
  return zonedToInstant({ year: y, month: mo, day: d, hour: h || 0, minute: mi || 0 }, tz);
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function wallDateString(w: Pick<WallClock, 'year' | 'month' | 'day'>): string {
  return `${w.year}-${pad2(w.month)}-${pad2(w.day)}`;
}

export function wallTimeString(w: Pick<WallClock, 'hour' | 'minute'>): string {
  return `${pad2(w.hour)}:${pad2(w.minute)}`;
}

/** Today's date ("YYYY-MM-DD") on a zone's calendar. */
export function todayIn(tz: string, now: Date = new Date()): string {
  return wallDateString(wallClockIn(now, tz));
}

// ── Reading stored events ───────────────────────────────────────────────────

export type EventTimeFields = { day: Event['day'] | { seconds: number } | Date | unknown; hour?: string; timeZone?: string };

export function timestampSeconds(ts: unknown): number {
  if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
  const s = (ts as { seconds?: unknown } | null | undefined)?.seconds;
  if (typeof s === 'number') return s;
  const fn = (ts as { toMillis?: () => number } | null | undefined)?.toMillis;
  return typeof fn === 'function' ? Math.floor(fn.call(ts) / 1000) : 0;
}

/** The zone whose calendar the stored `day` should be read in. */
export function eventZone(event: EventTimeFields): string {
  return isValidTimeZone(event.timeZone) ? event.timeZone : LEGACY_EVENT_TIME_ZONE;
}

/** "YYYY-MM-DD" as the poet chose it (for date inputs and grouping). */
export function eventDateString(event: EventTimeFields): string {
  const secs = timestampSeconds(event.day);
  if (!secs) return '';
  return wallDateString(wallClockIn(new Date(secs * 1000), eventZone(event)));
}

/** When the event really starts, for legacy and current records alike. */
export function eventStartMs(event: EventTimeFields): number {
  const secs = timestampSeconds(event.day);
  if (!secs) return 0;
  if (isValidTimeZone(event.timeZone)) return secs * 1000;
  const date = eventDateString(event);
  const hour = isTimeString(event.hour) ? event.hour : '00:00';
  return eventInstant(date, hour, DEFAULT_EVENT_TIME_ZONE).getTime();
}

export function isEventPast(event: EventTimeFields, now: number = Date.now()): boolean {
  const start = eventStartMs(event);
  return start > 0 && start + EVENT_GRACE_MS < now;
}

function formatInZone(event: EventTimeFields, options: Intl.DateTimeFormatOptions): string {
  const secs = timestampSeconds(event.day);
  if (!secs) return '';
  try {
    return new Date(secs * 1000).toLocaleDateString('es-CR', { ...options, timeZone: eventZone(event) });
  } catch {
    return '';
  }
}

/** "5 de noviembre de 2026": the same on the server and in every browser. */
export function formatEventDate(event: EventTimeFields): string {
  return formatInZone(event, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatEventDateShort(event: EventTimeFields): string {
  return formatInZone(event, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
}

/** Calendar tile: day number and short month. */
export function eventDayParts(event: EventTimeFields): { d: string; m: string } | null {
  if (!timestampSeconds(event.day)) return null;
  return {
    d: formatInZone(event, { day: '2-digit' }),
    m: formatInZone(event, { month: 'short' }).replace('.', ''),
  };
}

/** Format any instant on a zone's calendar (used for occurrence timelines). */
export function formatInstant(instant: Date, tz: string, options: Intl.DateTimeFormatOptions): string {
  try {
    return instant.toLocaleString('es-CR', { ...options, timeZone: tz });
  } catch {
    return instant.toLocaleString('es-CR', options);
  }
}
