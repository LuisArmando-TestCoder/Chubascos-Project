'use client';
import { useId, type ReactNode } from 'react';
import styles from './Studio.module.scss';

export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  /** Shows "n / max" and turns amber near the limit. */
  count?: number;
  max?: number;
  optional?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}

/** Label, control, hint and error wired together for screen readers. */
export function Field({ label, hint, error, count, max, optional, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  const near = max !== undefined && count !== undefined && count > max * 0.9;
  return (
    <div className={styles.field} data-invalid={error ? true : undefined}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {label}
          {optional && <span className={styles.optional}> · opcional</span>}
        </label>
        {max !== undefined && count !== undefined && (
          <span className={styles.counter} data-near={near || undefined} aria-hidden="true">
            {count}/{max}
          </span>
        )}
      </div>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errorId} className={styles.error}>{error}</p>}
    </div>
  );
}
