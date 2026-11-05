import cronstrue from 'cronstrue/i18n';
import { isValidTimeZone, wallClockIn, zonedToInstant } from './eventTime';

const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_NAMES_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const ORDINAL_LABELS_ES = ['1er', '2do', '3er', '4to'];
const ORDINAL_LABELS_LONG_ES = ['primer', 'segundo', 'tercer', 'cuarto'];

/**
 * Day-of-month ranges that encode the Nth occurrence of a weekday in a month.
 * 1st occurrence → days 1-7, 2nd → 8-14, 3rd → 15-21, 4th → 22-28
 */
const NTH_RANGES: Record<number, string> = {
  1: '1-7',
  2: '8-14',
  3: '15-21',
  4: '22-28',
};

const RANGE_TO_NTH: Record<string, number> = {
  '1-7': 1,
  '8-14': 2,
  '15-21': 3,
  '22-28': 4,
};

// ---------------------------------------------------------------------------
// Weekly cron helpers (existing)
// ---------------------------------------------------------------------------

/**
 * Convert a cron expression to a human-readable string in Spanish.
 * Handles weekly, single Nth-weekday, and multi-Nth-weekday (pipe-separated) patterns.
 */
export function cronToHuman(cron: string): string {
  // Check for multi-pattern (pipe-separated) first
  if (cron.includes('|')) {
    const multi = parseMultiNthWeekdayCron(cron);
    if (multi) {
      const dayName = DAY_NAMES_ES[multi.dayOfWeek];
      const ordinals = multi.nths.map(n => ORDINAL_LABELS_LONG_ES[n - 1] || `${n}º`);
      const joined = ordinals.length <= 2
        ? ordinals.join(' y ')
        : ordinals.slice(0, -1).join(', ') + ' y ' + ordinals[ordinals.length - 1];
      return `Cada ${joined} ${dayName.toLowerCase()} del mes a las ${multi.time}`;
    }
  }

  // Check for single Nth weekday pattern
  const nth = parseNthWeekdayCron(cron);
  if (nth) {
    const dayName = DAY_NAMES_ES[nth.dayOfWeek];
    const ordinal = ORDINAL_LABELS_LONG_ES[nth.nth - 1] || `${nth.nth}º`;
    return `Cada ${ordinal} ${dayName.toLowerCase()} del mes a las ${nth.time}`;
  }

  const weekly = parseCron(cron);
  if (WEEKLY_RE.test(cron.trim().replace(/\s+/g, ' ')) && weekly.days.length > 0) {
    if (weekly.days.length === 7) return `Todos los días a las ${weekly.time}`;
    const names = [...weekly.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_NAMES_ES[d].toLowerCase());
    const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
    return `Cada ${joined} a las ${weekly.time}`;
  }

  try {
    return cronstrue.toString(cron, { locale: 'es', use24HourTimeFormat: true });
  } catch {
    return cron;
  }
}

/**
 * Given an existing date string (YYYY-MM-DD) and time string (HH:MM),
 * infer a cron expression that repeats on the same day-of-week at that time.
 * e.g. Saturday 19:00 → "0 19 * * 6"
 */
export function dateToCron(dateStr: string, timeStr: string): string {
  const [hours, minutes] = parseTime(timeStr);
  const date = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
  const dayOfWeek = date.getDay(); // 0=Sun .. 6=Sat
  return `${minutes} ${hours} * * ${dayOfWeek}`;
}

/**
 * Build a cron expression from individual day-of-week selections and a time.
 * @param days Array of day indices (0=Sun, 1=Mon … 6=Sat)
 * @param timeStr "HH:MM"
 */
export function buildCron(days: number[], timeStr: string): string {
  if (days.length === 0) return '';
  const [hours, minutes] = parseTime(timeStr);
  const daysPart = [...new Set(days)].sort((a, b) => a - b).join(',');
  return `${minutes} ${hours} * * ${daysPart}`;
}

/**
 * Parse a cron expression back into { days: number[], time: string }.
 * Only handles the subset: "M H * * DOW"
 */
export function parseCron(cron: string): { days: number[]; time: string } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return { days: [], time: '' };

  const minute = parseInt(parts[0], 10) || 0;
  const hour = parseInt(parts[1], 10) || 0;
  const daysStr = parts[4];

  let days: number[] = [];
  if (daysStr !== '*') {
    days = daysStr.split(',').map((d) => parseInt(d, 10)).filter((d) => !isNaN(d));
  }

  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return { days, time };
}

/**
 * Get day name in Spanish by index.
 */
export function getDayName(dayIndex: number, short = false): string {
  const arr = short ? DAY_NAMES_SHORT_ES : DAY_NAMES_ES;
  return arr[dayIndex] || '';
}

/**
 * Get all day options for the selector.
 */
export function getDayOptions(): { value: number; label: string; short: string }[] {
  return DAY_NAMES_ES.map((name, i) => ({
    value: i,
    label: name,
    short: DAY_NAMES_SHORT_ES[i],
  }));
}

// ---------------------------------------------------------------------------
// Nth weekday-of-month helpers (new)
// ---------------------------------------------------------------------------

/**
 * Check if a cron expression represents an "Nth weekday of month" pattern.
 * Pattern: "M H dayRange * DOW" where dayRange is one of 1-7, 8-14, 15-21, 22-28
 */
export function isNthWeekdayCron(cron: string): boolean {
  return parseNthWeekdayCron(cron) !== null;
}

/**
 * Parse an Nth-weekday-of-month cron expression.
 * Returns null if it's not that pattern.
 *
 * Pattern: "M H dayRange * DOW"
 * e.g. "0 19 22-28 * 4" → 4th Thursday at 19:00
 */
export function parseNthWeekdayCron(
  cron: string
): { nth: number; dayOfWeek: number; time: string } | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const domPart = parts[2]; // day-of-month
  const monthPart = parts[3]; // month
  const dowPart = parts[4]; // day-of-week

  // Must have month = * and a recognized day-of-month range
  if (monthPart !== '*') return null;
  const nth = RANGE_TO_NTH[domPart];
  if (!nth) return null;

  // day-of-week must be a single digit 0–6
  const dayOfWeek = parseInt(dowPart, 10);
  if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return null;

  // Also verify dom is not '*' (weekly pattern)
  if (domPart === '*') return null;

  const minute = parseInt(parts[0], 10) || 0;
  const hour = parseInt(parts[1], 10) || 0;
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { nth, dayOfWeek, time };
}

/**
 * Build an Nth-weekday-of-month cron expression.
 * @param nth 1–4 (1st, 2nd, 3rd, 4th)
 * @param dayOfWeek 0=Sun … 6=Sat
 * @param timeStr "HH:MM"
 *
 * Example: buildNthWeekdayCron(4, 4, "19:00") → "0 19 22-28 * 4"
 */
export function buildNthWeekdayCron(nth: number, dayOfWeek: number, timeStr: string): string {
  const range = NTH_RANGES[nth];
  if (!range) return '';
  const [hours, minutes] = parseTime(timeStr);
  return `${minutes} ${hours} ${range} * ${dayOfWeek}`;
}

/**
 * Compute the next occurrence of the Nth weekday of a month from a reference date.
 * @param nth 1–4
 * @param dayOfWeek 0=Sun … 6=Sat
 * @param from Reference date (defaults to now)
 */
export function getNextNthWeekdayOccurrence(
  nth: number,
  dayOfWeek: number,
  from: Date = new Date()
): Date {
  // Try current month first, then next months
  const year = from.getFullYear();
  const month = from.getMonth();

  for (let offset = 0; offset < 13; offset++) {
    const candidateMonth = month + offset;
    const result = getNthWeekdayOfMonth(
      year + Math.floor(candidateMonth / 12),
      candidateMonth % 12,
      dayOfWeek,
      nth
    );
    if (result && result >= from) return result;
  }

  // Fallback (should never happen within 13 months)
  return from;
}

/**
 * Get the Nth occurrence of a specific weekday in a given month.
 * Returns null if the Nth occurrence doesn't exist (e.g. 5th Monday in a month with only 4).
 */
export function getNthWeekdayOfMonth(
  year: number,
  month: number, // 0-indexed
  dayOfWeek: number, // 0=Sun … 6=Sat
  nth: number // 1-based
): Date | null {
  // Start from the 1st of the month
  const firstOfMonth = new Date(year, month, 1);
  const firstDow = firstOfMonth.getDay();

  // Calculate the day-of-month for the first occurrence of the target weekday
  let firstOccurrenceDay = 1 + ((dayOfWeek - firstDow + 7) % 7);
  // Add (nth - 1) weeks
  const targetDay = firstOccurrenceDay + (nth - 1) * 7;

  // Check it's still in the same month
  const result = new Date(year, month, targetDay);
  if (result.getMonth() !== month) return null;
  return result;
}

/**
 * Get ordinal options for the selector (1er, 2do, 3er, 4to).
 */
export function getOrdinalOptions(): { value: number; label: string; labelLong: string }[] {
  return ORDINAL_LABELS_ES.map((label, i) => ({
    value: i + 1,
    label,
    labelLong: ORDINAL_LABELS_LONG_ES[i],
  }));
}

/**
 * Get the short ordinal label in Spanish.
 */
export function getOrdinalLabel(nth: number, long = false): string {
  const arr = long ? ORDINAL_LABELS_LONG_ES : ORDINAL_LABELS_ES;
  return arr[nth - 1] || `${nth}º`;
}

// ---------------------------------------------------------------------------
// Multi-Nth weekday helpers (pipe-separated patterns)
// ---------------------------------------------------------------------------

/**
 * Build a multi-Nth-weekday cron expression (pipe-separated).
 * @param nths Array of ordinals [1,3] → "1st and 3rd"
 * @param dayOfWeek 0=Sun … 6=Sat
 * @param timeStr "HH:MM"
 *
 * Example: buildMultiNthWeekdayCron([1,3], 5, "20:00") → "0 20 1-7 * 5|0 20 15-21 * 5"
 */
export function buildMultiNthWeekdayCron(nths: number[], dayOfWeek: number, timeStr: string): string {
  if (nths.length === 0) return '';
  if (nths.length === 1) return buildNthWeekdayCron(nths[0], dayOfWeek, timeStr);
  return [...new Set(nths)]
    .sort((a, b) => a - b)
    .map(n => buildNthWeekdayCron(n, dayOfWeek, timeStr))
    .filter(Boolean)
    .join('|');
}

/**
 * Parse a pipe-separated multi-Nth-weekday cron expression.
 * Returns null if not a valid multi-pattern.
 *
 * Example: "0 20 1-7 * 5|0 20 15-21 * 5" → { nths: [1,3], dayOfWeek: 5, time: "20:00" }
 */
export function parseMultiNthWeekdayCron(
  cron: string
): { nths: number[]; dayOfWeek: number; time: string } | null {
  if (!cron.includes('|')) {
    // Single pattern — wrap as multi
    const single = parseNthWeekdayCron(cron);
    if (!single) return null;
    return { nths: [single.nth], dayOfWeek: single.dayOfWeek, time: single.time };
  }

  const parts = cron.split('|');
  const parsed = parts.map(p => parseNthWeekdayCron(p.trim())).filter(Boolean) as
    { nth: number; dayOfWeek: number; time: string }[];

  if (parsed.length === 0) return null;

  // All must share the same dayOfWeek and time
  const { dayOfWeek, time } = parsed[0];
  if (!parsed.every(p => p.dayOfWeek === dayOfWeek && p.time === time)) return null;

  return { nths: parsed.map(p => p.nth).sort((a, b) => a - b), dayOfWeek, time };
}

/**
 * Check if a cron expression is a multi-Nth-weekday pattern.
 */
export function isMultiNthWeekdayCron(cron: string): boolean {
  return parseMultiNthWeekdayCron(cron) !== null;
}

// ---------------------------------------------------------------------------
// Universal next-occurrence from any cron expression
// ---------------------------------------------------------------------------

/**
 * Compute the next occurrence from a cron expression, on the wall clock of
 * `timeZone` (the venue's zone). Handles weekly ("M H * * DOW,DOW"), monthly
 * Nth-weekday ("M H 1-7 * DOW") and pipe-joined combinations.
 *
 * Dates are walked on a naive UTC calendar and only converted to a real
 * instant at the end, so the server's own zone never leaks into the result.
 * @param timeZone IANA zone; defaults to the runtime's zone (legacy behaviour)
 * @returns The next Date strictly after `from`, or null if unparseable
 */
export function getNextOccurrenceFromCron(
  cronExpression: string,
  from: Date = new Date(),
  timeZone?: string
): Date | null {
  const tz = timeZone && isValidTimeZone(timeZone) ? timeZone : localZone();
  const rules = cronRules(cronExpression);
  if (!rules) return null;

  const start = wallClockIn(from, tz);
  let best: Date | null = null;
  // 70 days covers "1st Monday" even when this month's has just passed.
  for (let offset = 0; offset <= 70 && !best; offset++) {
    const day = new Date(Date.UTC(start.year, start.month - 1, start.day + offset));
    const dow = day.getUTCDay();
    const dom = day.getUTCDate();
    for (const r of rules) {
      const dayMatches = r.nth ? dow === r.days[0] && Math.ceil(dom / 7) === r.nth && dom <= 28 : r.days.includes(dow);
      if (!dayMatches) continue;
      const instant = zonedToInstant(
        { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: dom, hour: r.hour, minute: r.minute },
        tz
      );
      if (instant > from && (!best || instant < best)) best = instant;
    }
  }
  return best;
}

/** The next `count` occurrences after `from` (for timelines and previews). */
export function listOccurrences(
  cronExpression: string,
  count: number,
  from: Date = new Date(),
  timeZone?: string
): Date[] {
  const out: Date[] = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const next = getNextOccurrenceFromCron(cronExpression, cursor, timeZone);
    if (!next) break;
    out.push(next);
    cursor = next;
  }
  return out;
}

const WEEKLY_RE = /^([0-5]?\d) ([01]?\d|2[0-3]) \* \* ([0-6](?:,[0-6])*)$/;

/**
 * Only the schedules the studio can build are accepted, so whatever is stored
 * can always be read back, described and advanced.
 */
export function isSupportedCron(cron: unknown): cron is string {
  if (typeof cron !== 'string' || cron.length === 0 || cron.length > 200) return false;
  const parts = cron.split('|').map((p) => p.trim());
  if (parts.length > 4) return false;
  if (parts.length > 1) return parseMultiNthWeekdayCron(cron) !== null && parts.every((p) => parseNthWeekdayCron(p));
  const only = parts[0].replace(/\s+/g, ' ');
  return WEEKLY_RE.test(only) || parseNthWeekdayCron(only) !== null;
}

interface CronRule { nth: number | null; days: number[]; hour: number; minute: number }

function cronRules(cron: string): CronRule[] | null {
  if (!isSupportedCron(cron)) return null;
  const rules: CronRule[] = [];
  for (const part of cron.split('|').map((p) => p.trim())) {
    const nth = parseNthWeekdayCron(part);
    if (nth) {
      const [hour, minute] = parseTime(nth.time);
      rules.push({ nth: nth.nth, days: [nth.dayOfWeek], hour, minute });
      continue;
    }
    const { days, time } = parseCron(part);
    if (days.length === 0) return null;
    const [hour, minute] = parseTime(time);
    rules.push({ nth: null, days, hour, minute });
  }
  return rules;
}

function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function parseTime(timeStr: string): [number, number] {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return [h || 0, m || 0];
}
