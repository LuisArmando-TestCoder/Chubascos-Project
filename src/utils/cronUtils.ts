import cronstrue from 'cronstrue/i18n';

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
 * Handles both weekly and Nth-weekday-of-month patterns.
 */
export function cronToHuman(cron: string): string {
  // Check for Nth weekday pattern first
  const nth = parseNthWeekdayCron(cron);
  if (nth) {
    const dayName = DAY_NAMES_ES[nth.dayOfWeek];
    const ordinal = ORDINAL_LABELS_LONG_ES[nth.nth - 1] || `${nth.nth}º`;
    return `Cada ${ordinal} ${dayName.toLowerCase()} del mes a las ${nth.time}`;
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
  const daysPart = days.sort((a, b) => a - b).join(',');
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
// Universal next-occurrence from any cron expression
// ---------------------------------------------------------------------------

/**
 * Compute the next occurrence date from a cron expression.
 * Handles both weekly ("M H * * DOW,DOW") and monthly Nth-weekday ("M H range * DOW") patterns.
 * @param cronExpression The cron string
 * @param from Reference date (defaults to now)
 * @returns The next Date, or null if unparseable
 */
export function getNextOccurrenceFromCron(
  cronExpression: string,
  from: Date = new Date()
): Date | null {
  // Try monthly Nth-weekday first
  const nthData = parseNthWeekdayCron(cronExpression);
  if (nthData) {
    const [hours, minutes] = nthData.time.split(':').map(Number);
    const next = getNextNthWeekdayOccurrence(nthData.nth, nthData.dayOfWeek, from);
    next.setHours(hours, minutes, 0, 0);
    // If the time already passed today, get next month's occurrence
    if (next <= from) {
      const dayAfter = new Date(next);
      dayAfter.setDate(dayAfter.getDate() + 1);
      const nextNext = getNextNthWeekdayOccurrence(nthData.nth, nthData.dayOfWeek, dayAfter);
      nextNext.setHours(hours, minutes, 0, 0);
      return nextNext;
    }
    return next;
  }

  // Try weekly pattern
  const { days, time } = parseCron(cronExpression);
  if (days.length === 0 || !time) return null;

  const [hours, minutes] = time.split(':').map(Number);
  
  // Check the next 8 days (guarantees finding a match)
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = new Date(from);
    candidate.setDate(candidate.getDate() + offset);
    candidate.setHours(hours, minutes, 0, 0);
    
    if (days.includes(candidate.getDay()) && candidate > from) {
      return candidate;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function parseTime(timeStr: string): [number, number] {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return [h || 0, m || 0];
}
