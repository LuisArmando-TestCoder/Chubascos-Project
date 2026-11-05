'use client';
import { useId, useRef, type ReactNode } from 'react';
import { HintTip } from './HintTip';
import { scrollToStage } from './hooks';
import styles from './Studio.module.scss';

export interface StageMeta {
  id: string;
  title: string;
  done: boolean;
  optional?: boolean;
}

interface StageProps extends StageMeta {
  hint?: ReactNode;
  children: ReactNode;
}

/**
 * One step of a studio form. Stages sit on a rail of drops: a drop fills
 * when the step has what it needs, so the poet always sees what's left.
 */
export function Stage({ id, title, hint, done, optional, children }: StageProps) {
  const headingId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const state = done ? 'Listo' : optional ? 'Opcional' : 'Pendiente';
  return (
    <section id={id} className={styles.stage} data-done={done || undefined} aria-labelledby={headingId}>
      <span className={styles.stageDrop} aria-hidden="true" />
      <header ref={headerRef} className={styles.stageHeader}>
        <span className={styles.stageTitleRow}>
          <h3 id={headingId} className={styles.stageTitle}>{title}</h3>
          {/* The explanation lives behind a drop: on hover, focus or tap. */}
          {hint && <HintTip label={`Ayuda: ${title}`} hoverZone={headerRef}>{hint}</HintTip>}
        </span>
        <span className={styles.stageState}>{state}</span>
      </header>
      <div className={styles.stageBody}>{children}</div>
    </section>
  );
}

/** Where you are in the form: one drop per stage, each a jump link. */
export function StageProgress({ stages, label }: { stages: StageMeta[]; label: string }) {
  const required = stages.filter((s) => !s.optional);
  const ready = required.filter((s) => s.done).length;
  return (
    <nav className={styles.progress} aria-label={label}>
      <ol className={styles.progressList}>
        {stages.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={styles.progressItem}
              data-done={s.done || undefined}
              data-optional={s.optional || undefined}
              onClick={(e) => { e.preventDefault(); scrollToStage(s.id); }}
            >
              <span className={styles.progressDrop} aria-hidden="true" />
              <span>{s.title}</span>
              <span className={styles.srOnly}>{s.done ? ' (listo)' : s.optional ? ' (opcional)' : ' (pendiente)'}</span>
            </a>
          </li>
        ))}
      </ol>
      <span className={styles.progressCount} aria-hidden="true">{ready}/{required.length}</span>
    </nav>
  );
}
