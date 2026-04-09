import cronstrue from 'cronstrue/i18n';

const DAY_NAMES_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_NAMES_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Convert a cron expression to a human-readable string in Spanish.
 */
export function cronToHuman(cron: string): string {
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

function parseTime(timeStr: string): [number, number] {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return [h || 0, m || 0];
}
