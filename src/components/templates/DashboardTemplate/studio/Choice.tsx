'use client';
import { useId, type ReactNode } from 'react';
import styles from './Studio.module.scss';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
}

interface ChoiceProps<T extends string> {
  legend: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  /** `cards` shows descriptions; `segmented` is a compact pill row. */
  variant?: 'cards' | 'segmented';
}

/** Native radios (arrow keys for free), dressed as water-filled cards. */
export function Choice<T extends string>({ legend, value, options, onChange, variant = 'cards' }: ChoiceProps<T>) {
  const name = useId();
  return (
    <fieldset className={variant === 'cards' ? styles.choiceCards : styles.choiceSegmented}>
      <legend className={styles.label}>{legend}</legend>
      <div className={styles.choiceList}>
        {options.map((o) => (
          <label key={o.value} className={styles.choiceItem} data-checked={o.value === value || undefined}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className={styles.choiceInput}
            />
            <span className={styles.choiceLabel}>{o.label}</span>
            {variant === 'cards' && o.description && <span className={styles.choiceDesc}>{o.description}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
