import styles from './LogoMark.module.scss';

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Accessible label; omit when the mark sits next to the word "Chubascos". */
  title?: string;
}

/**
 * The Chubascos mark: three slanted strokes of wind-driven rain, uneven like
 * lines of verse. Paths live on a 64-unit grid, the same as app/icon.svg.
 */
export default function LogoMark({ size = 22, className, title }: LogoMarkProps) {
  return (
    <svg
      className={`${styles.mark} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path className={styles.a} d="M39 11 29 51" pathLength={100} />
      <path className={styles.b} d="M23 17 15 49" pathLength={100} />
      <path className={styles.c} d="M49 29 43 53" pathLength={100} />
    </svg>
  );
}
