'use client';
import { useEffect, useId, useRef, useState } from 'react';
import {
  getDayOptions,
  buildCron,
  parseCron,
  cronToHuman,
  parseMultiNthWeekdayCron,
  buildMultiNthWeekdayCron,
  getOrdinalOptions,
} from '@/utils/cronUtils';
import styles from './CronScheduleInput.module.scss';

export type RecurrenceMode = 'weekly' | 'monthly';

interface CronScheduleInputProps {
  value: string;               // current cron expression
  onChange: (cron: string) => void;
  /** Time of day (HH:MM). With `hideTime`, this is the only source of time. */
  time?: string;
  /** Controlled mode: hides the internal Semanal/Mensual toggle. */
  mode?: RecurrenceMode;
  /** The surrounding form already asks for the time. */
  hideTime?: boolean;
  /** Drop the boxed header (inside studio stages). */
  compact?: boolean;
}

// Spanish calendars start on Monday.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function CronScheduleInput({ value, onChange, time: externalTime, mode: controlledMode, hideTime = false, compact = false }: CronScheduleInputProps) {
  const dayOptions = WEEK_ORDER.map((i) => getDayOptions()[i]);
  const ordinalOptions = getOrdinalOptions();
  const timeId = useId();

  const multiParsed = value ? parseMultiNthWeekdayCron(value) : null;
  const weeklyParsed = multiParsed ? { days: [] as number[], time: '' } : parseCron(value);

  const [innerMode, setInnerMode] = useState<RecurrenceMode>(multiParsed ? 'monthly' : 'weekly');
  const mode = controlledMode ?? innerMode;

  const [selectedDays, setSelectedDays] = useState<number[]>(weeklyParsed.days);
  const [ownTime, setOwnTime] = useState(multiParsed?.time || weeklyParsed.time || externalTime || '');
  const scheduleTime = hideTime ? externalTime || '' : ownTime;

  const [selectedNths, setSelectedNths] = useState<number[]>(multiParsed?.nths || [1]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(multiParsed?.dayOfWeek ?? (weeklyParsed.days[0] ?? 1));

  // Fill the visible time from the form when it was empty.
  useEffect(() => {
    if (!hideTime && !ownTime && externalTime) setOwnTime(externalTime);
  }, [externalTime, hideTime, ownTime]);

  // One place builds the expression from the current selection.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    let next = '';
    if (scheduleTime) {
      next = mode === 'weekly'
        ? (selectedDays.length ? buildCron(selectedDays, scheduleTime) : '')
        : (selectedNths.length ? buildMultiNthWeekdayCron(selectedNths, selectedDayOfWeek, scheduleTime) : '');
    }
    if (next !== value) onChangeRef.current(next);
    // `value` is intentionally not a dependency: it is the output, not an input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedDays, selectedNths, selectedDayOfWeek, scheduleTime]);

  const toggle = (list: number[], item: number) => (list.includes(item) ? list.filter((d) => d !== item) : [...list, item]);
  const humanReadable = value ? cronToHuman(value) : null;

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {!compact && (
        <div className={styles.header}>
          <span className={styles.icon} aria-hidden="true">↻</span>
          <span className={styles.title}>Programación recurrente</span>
        </div>
      )}

      {!controlledMode && (
        <div className={styles.modeToggle} role="group" aria-label="Frecuencia">
          {(['weekly', 'monthly'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m}
              className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
              onClick={() => setInnerMode(m)}>
              {m === 'weekly' ? 'Semanal' : 'Mensual'}
            </button>
          ))}
        </div>
      )}

      {mode === 'weekly' ? (
        <div className={styles.monthlyRow}>
          <span className={styles.monthlyLabel} id={`${timeId}-days`}>Cada</span>
          <div className={styles.daysGrid} role="group" aria-labelledby={`${timeId}-days`}>
            {dayOptions.map((day) => {
              const isActive = selectedDays.includes(day.value);
              return (
                <button key={day.value} type="button" aria-pressed={isActive} aria-label={day.label}
                  className={`${styles.dayBtn} ${isActive ? styles.dayActive : ''}`}
                  onClick={() => setSelectedDays((prev) => toggle(prev, day.value))}>
                  <span className={styles.dayShort} aria-hidden="true">{day.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.monthlyGroup}>
          <div className={styles.monthlyRow}>
            <span className={styles.monthlyLabel} id={`${timeId}-nth`}>Cada</span>
            <div className={styles.ordinalGrid} role="group" aria-labelledby={`${timeId}-nth`}>
              {ordinalOptions.map((opt) => {
                const isActive = selectedNths.includes(opt.value);
                return (
                  <button key={opt.value} type="button" aria-pressed={isActive} aria-label={opt.labelLong}
                    className={`${styles.ordinalBtn} ${isActive ? styles.ordinalBtnActive : ''}`}
                    onClick={() => setSelectedNths((prev) => toggle(prev, opt.value))}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.monthlyRow}>
            <span className={styles.monthlyLabel} id={`${timeId}-dow`}>Día</span>
            <div className={styles.daysGrid} role="radiogroup" aria-labelledby={`${timeId}-dow`}>
              {dayOptions.map((day) => {
                const isActive = selectedDayOfWeek === day.value;
                return (
                  <button key={day.value} type="button" role="radio" aria-checked={isActive} aria-label={day.label}
                    className={`${styles.dayBtn} ${isActive ? styles.dayActive : ''}`}
                    onClick={() => setSelectedDayOfWeek(day.value)}>
                    <span className={styles.dayShort} aria-hidden="true">{day.short}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className={styles.monthlyCaption}>de cada mes</span>
        </div>
      )}

      {!hideTime && (
        <div className={styles.timeRow}>
          <label className={styles.timeLabel} htmlFor={timeId}>Hora de repetición</label>
          <input id={timeId} type="time" className={styles.timeInput} value={ownTime} onChange={(e) => setOwnTime(e.target.value)} />
        </div>
      )}

      {humanReadable ? (
        <p className={styles.preview} aria-live="polite">
          <span className={styles.previewIcon} aria-hidden="true">↻</span>
          <span className={styles.previewText}>{humanReadable}</span>
        </p>
      ) : (
        <p className={styles.hint}>
          {!scheduleTime
            ? 'Elige una hora para la repetición.'
            : mode === 'weekly'
              ? 'Elige al menos un día de la semana.'
              : 'Elige al menos una semana del mes.'}
        </p>
      )}
    </div>
  );
}
