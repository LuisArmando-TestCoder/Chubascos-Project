import type { Metadata } from 'next';
import { Footer } from '@/components/organisms/Footer/Footer';
import styles from './privacidad.module.scss';

export const metadata: Metadata = {
  title: 'Tu obra, tu derecho | Chubascos',
  description: 'Política de privacidad y derechos de autor en Chubascos. Tu obra te pertenece.',
};

export default function PrivacidadPage() {
  return (
    <>
      <main className={styles.main}>
        <article className={styles.article}>
          <h1 className={styles.title}>Tu obra, tu derecho</h1>
          <p className={styles.lead}>
            En Chubascos creemos que el arte pertenece a quien lo crea.
            Esta página explica tus derechos como autor y cómo tratamos tu información.
          </p>

          <section className={styles.section}>
            <h2>Propiedad intelectual</h2>
            <p>
              Todo lo que publicas en Chubascos te pertenece a ti. No cedemos, vendemos ni
              licenciamos tu obra a terceros. Al publicar en esta plataforma, nos otorgas
              únicamente el permiso necesario para mostrar tu obra a otros usuarios.
            </p>
            <p>
              Si quieres eliminar tu obra de la plataforma, puedes hacerlo en cualquier momento
              desde tu panel. La eliminación es definitiva.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Datos que recopilamos</h2>
            <p>
              Solo recopilamos tu dirección de correo electrónico para que puedas acceder a la plataforma.
              No pedimos nombres reales, números de teléfono ni documentos de identidad.
            </p>
            <p>
              Los datos de uso (qué páginas visitas, cuándo) no son recopilados ni vendidos.
              No usamos cookies de seguimiento de terceros.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Notificaciones</h2>
            <p>
              Si alguien te guarda como poeta favorito, podría recibir una notificación por correo
              cuando publiques nuevo contenido. Siempre puedes desactivar esto desde tu panel.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Seguridad</h2>
            <p>
              Usamos autenticación sin contraseña: cada vez que quieras entrar, te enviamos
              un código temporal a tu correo. Este código expira en 10 minutos y solo puede
              usarse una vez.
            </p>
            <p>
              Tus sesiones se guardan en cookies cifradas del servidor. Nunca enviamos tu
              información a servicios de análisis externos.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Guardados locales</h2>
            <p>
              Los poemas, poetas y eventos que guardas sin iniciar sesión se almacenan
              localmente en tu navegador. Esta información no sale de tu dispositivo.
            </p>
          </section>

          <section className={styles.section}>
            <h2>Eliminación de cuenta</h2>
            <p>
              Puedes solicitar la eliminación completa de tu cuenta y toda tu obra desde
              tu panel. La eliminación es permanente e irreversible dentro de los 30 días
              posteriores a la solicitud.
            </p>
          </section>

          <p className={styles.closing}>
            Preguntas o inquietudes: escríbenos directamente desde tu perfil.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
