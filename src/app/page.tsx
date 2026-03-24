import styles from './page.module.scss';

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.title}>CHUBASCOS</h1>
          <p className={styles.subtitle}>Lluvias repentinas dejando charcos</p>
        </div>
      </section>
      
      {/* Placeholder for future sections */}
      <section className={styles.placeholder}>
        <div className={styles.container}>
          <p>Próximamente: Eventos, Poemas y Alquimia Digital.</p>
        </div>
      </section>
    </main>
  );
}
