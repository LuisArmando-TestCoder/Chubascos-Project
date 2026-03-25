import type { Metadata } from 'next';
import { Footer } from '@/components/organisms/Footer/Footer';
import styles from './normas.module.scss';

export const metadata: Metadata = {
  title: 'Normas de comunidad | Chubascos',
  description: 'Normas y guía de comportamiento para la comunidad Chubascos.',
};

export default function NormasPage() {
  return (
    <>
      <main className={styles.main}>
        <article className={styles.article}>
          <h1 className={styles.title}>Normas de comunidad</h1>
          <p className={styles.lead}>
            Chubascos es un espacio para poetas, artistas y alquimistas digitales.
            Aquí las palabras se convierten en lluvia. Para que ese espacio sea fértil y seguro,
            pedimos que cada persona que lo habite lo cuide.
          </p>

          <section className={styles.section}>
            <h2>1. Respeto absoluto</h2>
            <p>
              No se toleran ataques personales, discriminación por identidad, orientación,
              origen, género o cualquier otra característica. La poesía puede ser cruda y honesta;
              la crueldad directa hacia otras personas, no.
            </p>
          </section>

          <section className={styles.section}>
            <h2>2. Contenido auténtico</h2>
            <p>
              Solo publica obra que sea tuya o para la cual tengas permiso explícito del autor.
              El plagio deshonra tanto al que lo practica como al espacio que lo acoge.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Consentimiento digital</h2>
            <p>
              No compartas información personal de otras personas sin su consentimiento.
              No uses esta plataforma para acoso, seguimiento no deseado ni para contactar
              a personas que no quieren ser contactadas.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Contenido sensible</h2>
            <p>
              Si tu obra contiene temáticas difíciles (violencia, duelo, trauma), puedes publicarla
              con respeto y contexto. No se permite contenido explícitamente sexual o violento
              sin propósito artístico claro.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. Buena fe</h2>
            <p>
              Usa la plataforma con honestidad. No ataques, manipules ni satures los sistemas
              con contenido automatizado o spam. Las etiquetas son para describir tu obra,
              no para capturar audiencias que no buscan lo que publicas.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Consecuencias</h2>
            <p>
              La violación reiterada o grave de estas normas puede resultar en la eliminación
              del contenido o la cuenta. Chubascos se reserva el derecho de quitar publicaciones
              que dañen la integridad del espacio.
            </p>
          </section>

          <p className={styles.closing}>
            Este espacio es de todos los que lo habitan. Cuídalo como cuidas tu obra.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
