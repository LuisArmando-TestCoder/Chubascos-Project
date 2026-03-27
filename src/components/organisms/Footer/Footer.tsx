import Link from 'next/link';
import i18n from '@/utils/i18n';
import styles from './Footer.module.scss';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.brand}>CHUBASCOS</p>
        <p className={styles.sub}>Lluvias repentinas dejando charcos</p>
        <nav className={styles.nav} aria-label="Pie de página">
          <Link href="/normas">{i18n.footer.norms}</Link>
          <Link href="/privacidad">{i18n.footer.privacy}</Link>
          <Link href="/buscar">{i18n.common.search}</Link>
          <Link href="/guardados">{i18n.common.saved}</Link>
        </nav>
        <p className={styles.copy}>{i18n.footer.rights.replace('{year}', year.toString())}</p>
      </div>
    </footer>
  );
}
