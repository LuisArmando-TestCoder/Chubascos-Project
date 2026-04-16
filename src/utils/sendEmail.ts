import nodemailer from 'nodemailer';

console.log(`[SMTP] Configurando Nodemailer. Host: ${process.env.SMTP_HOST}, Puerto: ${process.env.SMTP_PORT}, Usuario: ${process.env.SMTP_USER ? 'Definido' : 'No definido'}`);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function stripHtmlAndMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Remove HTML
    .replace(/[#_*~`>]/g, '') // Remove basic markdown symbols
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Extract text from links
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

function getExcerpt(content: string, length = 120): string {
  const cleanText = stripHtmlAndMarkdown(content);
  if (cleanText.length <= length) return cleanText;
  return cleanText.substring(0, length) + '...';
}

export async function sendNotificationEmail(email: string, authorId: string, authorName: string, data: any) {
  let subject = '';
  let title = '';
  let description = '';
  let linkLabel = '';
  let linkUrl = '';
  let snippet = '';

  const baseUrl = 'https://chubascos-project.netlify.app';

  if (data.type === 'post') {
    subject = `Nuevo poema de ${authorName}: ${data.title}`;
    title = data.title;
    description = `El poeta ${authorName} ha dejado un nuevo charco.`;
    linkLabel = 'Leer poema completo';
    linkUrl = `${baseUrl}/u/${authorId}/p/${data.slug}`;
    snippet = getExcerpt(data.content || '');
  } else if (data.type === 'book') {
    subject = `Nuevo libro de ${authorName}: ${data.title}`;
    title = data.title;
    description = `El poeta ${authorName} ha publicado un nuevo libro.`;
    linkLabel = 'Ver libro';
    linkUrl = `${baseUrl}/u/${authorId}/b/${data.slug}`;
    snippet = getExcerpt(data.description || '');
  } else if (data.type === 'event') {
    subject = `Nuevo evento de ${authorName}: ${data.title}`;
    title = data.title;
    description = `${authorName} ha creado un nuevo evento.`;
    linkLabel = 'Ver evento y agendar';
    linkUrl = `${baseUrl}/e/${data.id}`;
    snippet = getExcerpt(data.description || '');
  } else if (data.type === 'event_subscription') {
    subject = `Nueva solicitud para tu evento: ${data.title}`;
    title = data.title;
    description = `${authorName} quiere asistir a tu evento.`;
    linkLabel = 'Gestionar participantes';
    linkUrl = `${baseUrl}/e/${data.eventId}`;
  }

  const snippetHtml = snippet ? `
    <div style="background-color: #1a1a1a; padding: 20px; border-left: 4px solid #6d5dfc; margin: 20px 0; border-radius: 4px; font-style: italic; color: #d0d0d0;">
      "${snippet}"
    </div>
  ` : '';

  const mailOptions = {
    from: `"Chubascos" <${process.env.SMTP_USER}>`,
    to: email,
    subject: subject || `Notificación de Chubascos`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0a0a0a; color: #ffffff; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d5dfc; margin: 0; font-size: 28px; letter-spacing: 2px;">CHUBASCOS</h1>
          <p style="color: #888; font-size: 14px; margin-top: 5px;">Cultura efímera, rastros eternos</p>
        </div>
        
        <div style="background-color: #121212; border: 1px solid #222; border-radius: 8px; padding: 30px;">
          <p style="font-size: 16px; margin-top: 0; color: #eee;">${description}</p>
          
          <h2 style="color: #fff; margin-bottom: 10px; font-size: 22px;">${title}</h2>
          
          ${snippetHtml}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${linkUrl}" style="display: inline-block; background-color: #6d5dfc; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
              ${linkLabel}
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; border-top: 1px solid #222; padding-top: 20px;">
          <p style="color: #666; font-size: 12px;">
            Recibes este correo porque sigues a este poeta en Chubascos.<br>
            <a href="${baseUrl}" style="color: #6d5dfc; text-decoration: none;">Visitar Chubascos</a>
          </p>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

export async function sendOtpEmail(email: string, otp: string) {
  const mailOptions = {
    from: `"Chubascos" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Tu código de acceso a Chubascos: ${otp}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #0a0a0a; color: #ffffff; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6d5dfc; margin: 0; font-size: 28px; letter-spacing: 2px;">CHUBASCOS</h1>
          <p style="color: #888; font-size: 14px; margin-top: 5px;">Lluvias repentinas dejando charcos.</p>
        </div>
        
        <div style="background-color: #121212; border: 1px solid #222; border-radius: 8px; padding: 30px;">
          <p style="text-align: center; font-size: 16px; margin-top: 0; color: #eee;">Tu código de acceso es:</p>
          <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #6d5dfc; margin: 20px 0;">
            ${otp}
          </div>
          <p style="text-align: center; color: #888; font-size: 14px; margin-bottom: 0;">Este código expirará en 10 minutos.</p>
        </div>
      </div>
    `,
  };

  try {
    console.log(`[SMTP] Intentando enviar correo a: ${email}`);
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ [SMTP] Correo enviado exitosamente a: ${email}. ID: ${result.messageId}`);
    return result;
  } catch (error: any) {
    console.error(`❌ [SMTP] Fallo al enviar el correo a: ${email}. Detalle del error:`, error.message || error);
    throw error;
  }
}
