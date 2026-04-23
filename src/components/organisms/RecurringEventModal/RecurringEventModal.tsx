'use client';
import { useEffect, useRef } from 'react';
import {
  cronToHuman,
  parseCron,
  getDayName,
  isNthWeekdayCron,
  parseMultiNthWeekdayCron,
  getOrdinalLabel,
} from '@/utils/cronUtils';
import styles from './RecurringEventModal.module.scss';

interface RecurringEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  cronExpression: string;
  eventTitle: string;
  place: string;
}

export function RecurringEventModal({
  isOpen,
  onClose,
  cronExpression,
  eventTitle,
  place,
}: RecurringEventModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const humanSchedule = cronToHuman(cronExpression);
  const multiData = parseMultiNthWeekdayCron(cronExpression);
  const isMonthly = multiData !== null || isNthWeekdayCron(cronExpression);
  const { days, time } = parseCron(cronExpression);

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Evento recurrente"
    >
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className={styles.badge}>
          <span className={styles.badgeIcon}>↻</span>
          <span className={styles.badgeText}>
            {isMonthly ? 'Evento Mensual' : 'Evento Recurrente'}
          </span>
        </div>

        <h2 className={styles.title}>{eventTitle}</h2>

        <div className={styles.scheduleBlock}>
          <span className={styles.scheduleLabel}>Programación</span>
          <p className={styles.scheduleHuman}>{humanSchedule}</p>
        </div>

        {isMonthly && multiData ? (
          /* Monthly: ordinal badges + single highlighted day */
          <div className={styles.monthlyVisual}>
            <div className={styles.ordinalBadgeGroup}>
              {multiData.nths.map((n) => (
                <div key={n} className={styles.ordinalBadge}>
                  <span className={styles.ordinalValue}>{getOrdinalLabel(n)}</span>
                </div>
              ))}
            </div>
            <div className={styles.daysVisual}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <div
                  key={d}
                  className={`${styles.dayDot} ${d === multiData.dayOfWeek ? styles.dayDotActive : ''}`}
                >
                  <span className={styles.dayDotLabel}>{getDayName(d, true)}</span>
                </div>
              ))}
            </div>
            <span className={styles.monthlyCaption}>de cada mes</span>
          </div>
        ) : (
          /* Weekly: 7-day dots grid */
          <div className={styles.daysVisual}>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <div
                key={d}
                className={`${styles.dayDot} ${days.includes(d) ? styles.dayDotActive : ''}`}
              >
                <span className={styles.dayDotLabel}>{getDayName(d, true)}</span>
              </div>
            ))}
          </div>
        )}

        {(time || multiData?.time) && (
          <div className={styles.timeBlock}>
            <span className={styles.timeIcon}>⏰</span>
            <span className={styles.timeValue}>{multiData?.time || time}</span>
          </div>
        )}

        {place && (
          <div className={styles.placeBlock}>
            <span className={styles.placeLabel}>Lugar</span>
            <p className={styles.placeValue}>{place}</p>
          </div>
        )}

        <p className={styles.note}>
          {isMonthly
            ? 'Este evento se repite mensualmente. La fecha mostrada corresponde a la próxima ocurrencia.'
            : 'Este evento se repite de forma regular. La fecha mostrada corresponde a la próxima ocurrencia.'}
        </p>
      </div>
    </div>
  );
}
