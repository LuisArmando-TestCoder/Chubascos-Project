import styles from './page.module.scss';

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>CHUBASCOS</h1>
          <p className={styles.subtitle}>Lluvias repentinas dejando charcos</p>
        </div>
      </section>
      
      <div className={styles.grid}>
        <section className={styles.placeholderSection}>
          <h2>PRÓXIMAMENTE</h2>
          <p>“Donde el código se vuelve poesía y el azar se vuelve charco.”</p>
        </section>
      </div>
    </main>
  );
}
