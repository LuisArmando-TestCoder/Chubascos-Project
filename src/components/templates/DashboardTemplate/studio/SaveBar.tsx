'use client';
import type { ReactNode } from 'react';
import { Button } from '@/components/atoms/Button/Button';
import styles from './Studio.module.scss';

export type SaveTone = 'idle' | 'ok' | 'error';

interface SaveBarProps {
  label: string;
  onSave: () => void;
  loading?: boolean;
  disabled?: boolean;
  dirty?: boolean;
  message?: string;
  tone?: SaveTone;
  /** Extra action (e.g. "Ver el poema →"). */
  aside?: ReactNode;
  /** Missing steps, listed when the save is blocked. */
  missing?: string[];
}

/** The desk's edge: what will happen, and the one button that does it. */
export function SaveBar({ label, onSave, loading, disabled, dirty, message, tone = 'idle', aside, missing = [] }: SaveBarProps) {
  const status = message
    || (missing.length ? `Falta: ${missing.join(', ')}.` : dirty ? 'Cambios sin guardar.' : 'Todo guardado.');
  return (
    <div className={styles.saveBar} data-tone={message ? tone : missing.length ? 'idle' : dirty ? 'dirty' : 'idle'}>
      <div className={styles.saveStatus}>
        <p role="status" aria-live="polite" className={styles.saveMessage}>{status}</p>
        <span className={styles.saveKeys} aria-hidden="true">⌘ / Ctrl + ↵</span>
      </div>
      <div className={styles.saveActions}>
        {aside}
        <Button onClick={onSave} loading={loading} disabled={disabled} aria-keyshortcuts="Meta+Enter Control+Enter">
          {label}
        </Button>
      </div>
    </div>
  );
}
