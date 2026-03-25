import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <div className={styles.inner}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>Esta lluvia ya pasó</h1>
        <p className={styles.desc}>
          El poema, evento o perfil que buscas fue removido, renombrado o nunca existió.
          Si estás buscando una publicación específica, intenta con su ID directo.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>Volver al inicio</Link>
          <Link href="/buscar" className={styles.ghost}>Buscar</Link>
        </div>
      </div>
    </main>
  );
}
