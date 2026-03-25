import Link from 'next/link';
import styles from './Footer.module.scss';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.brand}>CHUBASCOS</p>
        <p className={styles.sub}>Lluvias repentinas dejando charcos</p>
        <nav className={styles.nav} aria-label="Pie de página">
          <Link href="/normas">Normas</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/buscar">Buscar</Link>
          <Link href="/guardados">Guardados</Link>
        </nav>
        <p className={styles.copy}>© {year} — Toda obra pertenece a su autor.</p>
      </div>
    </footer>
  );
}
