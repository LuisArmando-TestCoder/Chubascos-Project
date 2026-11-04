import Link from 'next/link';
import i18n from '@/utils/i18n';
import { WaterText } from '@/components/organisms/WaterText/WaterText';
import styles from './Footer.module.scss';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <div className={styles.horizon} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.mark}>
          <WaterText text={i18n.home.hero.title} className={styles.brand} />
          <p className={styles.sub}>{i18n.home.hero.subtitle}</p>
        </div>
        <nav className={styles.nav} aria-label="Pie de página">
          <Link href="/buscar">{i18n.common.search}</Link>
          <Link href="/guardados">{i18n.common.saved}</Link>
          <Link href="/normas">{i18n.footer.norms}</Link>
          <Link href="/privacidad">{i18n.footer.privacy}</Link>
        </nav>
        <p className={styles.copy}>{i18n.footer.rights.replace('{year}', year.toString())}</p>
      </div>
    </footer>
  );
}
