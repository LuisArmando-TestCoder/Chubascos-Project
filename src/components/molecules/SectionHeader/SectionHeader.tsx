import type { ReactNode } from 'react';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps {
  id: string;
  title: string;
  /** Large outlined word drifting behind the title (parallax). */
  echo?: string;
  aside?: ReactNode;
}

/** One header grammar for every section: the title, its drifting echo, an optional aside. */
export function SectionHeader({ id, title, echo, aside }: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      {echo && <span className={styles.echo} aria-hidden="true">{echo}</span>}
      <div className={styles.row}>
        <h2 className={styles.title} id={id}>{title}</h2>
        {aside && <div className={styles.aside}>{aside}</div>}
      </div>
    </header>
  );
}
