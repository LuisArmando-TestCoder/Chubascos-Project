import type { ReactNode } from 'react';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  id: string;
  /** Position in the page's record, e.g. 2 → "02". */
  index?: number;
  total?: number;
  kicker?: string;
  title: string;
  /** Large outlined word drifting behind the title (parallax). */
  echo?: string;
  aside?: ReactNode;
}

/** One header grammar for every section: index · kicker · title · echo. */
export function SectionHeader({ id, index, total, kicker, title, echo, aside }: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      {echo && <span className={styles.echo} aria-hidden="true">{echo}</span>}
      <div className={styles.meta}>
        {index !== undefined && (
          <span className={styles.index} aria-hidden="true">
            {String(index).padStart(2, '0')}{total ? ` / ${String(total).padStart(2, '0')}` : ''}
          </span>
        )}
        {kicker && <span className={styles.kicker}>{kicker}</span>}
      </div>
      <div className={styles.row}>
        <h2 className={styles.title} id={id}>{title}</h2>
        {aside && <div className={styles.aside}>{aside}</div>}
      </div>
    </header>
  );
}
