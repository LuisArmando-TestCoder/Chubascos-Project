'use client';
import { useState, useEffect, useCallback } from 'react';
import { getDayOptions, buildCron, parseCron, cronToHuman } from '@/utils/cronUtils';
import styles from './CronScheduleInput.module.scss';

interface CronScheduleInputProps {
  value: string;               // current cron expression
  onChange: (cron: string) => void;
  time?: string;               // pre-filled time from the event form (HH:MM)
}

export function CronScheduleInput({ value, onChange, time: externalTime }: CronScheduleInputProps) {
  const dayOptions = getDayOptions();
  const parsed = parseCron(value);

  const [selectedDays, setSelectedDays] = useState<number[]>(parsed.days);
  const [scheduleTime, setScheduleTime] = useState(parsed.time || externalTime || '');

  // Sync from external time when empty
  useEffect(() => {
    if (!scheduleTime && externalTime) {
      setScheduleTime(externalTime);
    }
  }, [externalTime]);

  // Rebuild cron whenever selections change
  const rebuild = useCallback((days: number[], t: string) => {
    if (days.length === 0 || !t) {
      onChange('');
      return;
    }
    const cron = buildCron(days, t);
    onChange(cron);
  }, [onChange]);

  const toggleDay = (dayIndex: number) => {
    const next = selectedDays.includes(dayIndex)
      ? selectedDays.filter((d) => d !== dayIndex)
      : [...selectedDays, dayIndex];
    setSelectedDays(next);
    rebuild(next, scheduleTime);
  };

  const handleTimeChange = (t: string) => {
    setScheduleTime(t);
    rebuild(selectedDays, t);
  };

  const humanReadable = value ? cronToHuman(value) : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>↻</span>
        <span className={styles.title}>Programación recurrente</span>
      </div>

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
          Selecciona al menos un día y una hora para establecer la recurrencia.
        </p>
      )}
    </div>
  );
}
