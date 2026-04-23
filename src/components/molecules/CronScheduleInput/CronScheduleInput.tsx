'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  getDayOptions,
  buildCron,
  parseCron,
  cronToHuman,
  isNthWeekdayCron,
  parseNthWeekdayCron,
  buildNthWeekdayCron,
  getOrdinalOptions,
} from '@/utils/cronUtils';
import styles from './CronScheduleInput.module.scss';

type RecurrenceMode = 'weekly' | 'monthly';

interface CronScheduleInputProps {
  value: string;               // current cron expression
  onChange: (cron: string) => void;
  time?: string;               // pre-filled time from the event form (HH:MM)
}

export function CronScheduleInput({ value, onChange, time: externalTime }: CronScheduleInputProps) {
  const dayOptions = getDayOptions();
  const ordinalOptions = getOrdinalOptions();

  // Detect initial mode from existing value
  const nthParsed = value ? parseNthWeekdayCron(value) : null;
  const weeklyParsed = parseCron(value);

  const [mode, setMode] = useState<RecurrenceMode>(nthParsed ? 'monthly' : 'weekly');

  // Weekly state
  const [selectedDays, setSelectedDays] = useState<number[]>(weeklyParsed.days);
  const [scheduleTime, setScheduleTime] = useState(
    nthParsed?.time || weeklyParsed.time || externalTime || ''
  );

  // Monthly state
  const [selectedNth, setSelectedNth] = useState<number>(nthParsed?.nth || 1);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(nthParsed?.dayOfWeek ?? 1);

  // Sync from external time when empty
  useEffect(() => {
    if (!scheduleTime && externalTime) {
      setScheduleTime(externalTime);
    }
  }, [externalTime]);

  // Rebuild cron whenever selections change (weekly)
  const rebuildWeekly = useCallback((days: number[], t: string) => {
    if (days.length === 0 || !t) {
      onChange('');
      return;
    }
    const cron = buildCron(days, t);
    onChange(cron);
  }, [onChange]);

  // Rebuild cron (monthly)
  const rebuildMonthly = useCallback((nth: number, dow: number, t: string) => {
    if (!t) {
      onChange('');
      return;
    }
    const cron = buildNthWeekdayCron(nth, dow, t);
    onChange(cron);
  }, [onChange]);

  // Mode switch handler
  const handleModeChange = (newMode: RecurrenceMode) => {
    setMode(newMode);
    if (newMode === 'weekly') {
      rebuildWeekly(selectedDays, scheduleTime);
    } else {
      rebuildMonthly(selectedNth, selectedDayOfWeek, scheduleTime);
    }
  };

  const toggleDay = (dayIndex: number) => {
    const next = selectedDays.includes(dayIndex)
      ? selectedDays.filter((d) => d !== dayIndex)
      : [...selectedDays, dayIndex];
    setSelectedDays(next);
    rebuildWeekly(next, scheduleTime);
  };

  const handleTimeChange = (t: string) => {
    setScheduleTime(t);
    if (mode === 'weekly') {
      rebuildWeekly(selectedDays, t);
    } else {
      rebuildMonthly(selectedNth, selectedDayOfWeek, t);
    }
  };

  const handleNthChange = (nth: number) => {
    setSelectedNth(nth);
    rebuildMonthly(nth, selectedDayOfWeek, scheduleTime);
  };

  const handleMonthlyDayChange = (dow: number) => {
    setSelectedDayOfWeek(dow);
    rebuildMonthly(selectedNth, dow, scheduleTime);
  };

  const humanReadable = value ? cronToHuman(value) : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>↻</span>
        <span className={styles.title}>Programación recurrente</span>
      </div>

      {/* Mode toggle */}
      <div className={styles.modeToggle}>
        <button
          type="button"
          className={`${styles.modeBtn} ${mode === 'weekly' ? styles.modeBtnActive : ''}`}
          onClick={() => handleModeChange('weekly')}
        >
          Semanal
        </button>
        <button
          type="button"
          className={`${styles.modeBtn} ${mode === 'monthly' ? styles.modeBtnActive : ''}`}
          onClick={() => handleModeChange('monthly')}
        >
          Mensual
        </button>
      </div>

      {mode === 'weekly' ? (
        /* Weekly: day-of-week grid */
        <div className={styles.daysGrid}>
          {dayOptions.map((day) => {
            const isActive = selectedDays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                className={`${styles.dayBtn} ${isActive ? styles.dayActive : ''}`}
                onClick={() => toggleDay(day.value)}
                aria-pressed={isActive}
                aria-label={day.label}
              >
                <span className={styles.dayShort}>{day.short}</span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Monthly: Nth ordinal + day-of-week selectors */
        <div className={styles.monthlyGroup}>
          <div className={styles.monthlyRow}>
            <span className={styles.monthlyLabel}>Cada</span>
            <div className={styles.ordinalGrid}>
              {ordinalOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.ordinalBtn} ${selectedNth === opt.value ? styles.ordinalBtnActive : ''}`}
                  onClick={() => handleNthChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.monthlyRow}>
            <span className={styles.monthlyLabel}>Día</span>
            <div className={styles.daysGrid}>
              {dayOptions.map((day) => {
                const isActive = selectedDayOfWeek === day.value;
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`${styles.dayBtn} ${isActive ? styles.dayActive : ''}`}
                    onClick={() => handleMonthlyDayChange(day.value)}
                    aria-pressed={isActive}
                    aria-label={day.label}
                  >
                    <span className={styles.dayShort}>{day.short}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className={styles.monthlyLabel}>de cada mes</span>
        </div>
      )}

      <div className={styles.timeRow}>
        <label className={styles.timeLabel} htmlFor="cronTime">Hora de repetición</label>
        <input
          id="cronTime"
          type="time"
          className={styles.timeInput}
          value={scheduleTime}
          onChange={(e) => handleTimeChange(e.target.value)}
        />
      </div>

      {humanReadable && (
        <div className={styles.preview}>
          <span className={styles.previewIcon}>✦</span>
          <span className={styles.previewText}>{humanReadable}</span>
        </div>
      )}

      {!value && (
        <p className={styles.hint}>
          {mode === 'weekly'
            ? 'Selecciona al menos un día y una hora para establecer la recurrencia.'
            : 'Selecciona el ordinal, el día de la semana y una hora.'}
        </p>
      )}
    </div>
  );
}
