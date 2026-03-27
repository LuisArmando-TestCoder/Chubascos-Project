import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendNotificationEmail(email: string, authorId: string, data: any) {
  let subject = '';
  let title = '';
  let description = '';
  let linkLabel = '';
  let linkUrl = '';

  if (data.type === 'post') {
    subject = `Nuevo poema de ${authorId}: ${data.title}`;
    title = data.title;
    description = 'Alguien que sigues ha dejado un nuevo charco.';
    linkLabel = 'Leer poema';
    linkUrl = `https://chubascos.app/u/${authorId}/p/${data.slug}`;
  } else if (data.type === 'event') {
    subject = `Nuevo evento de ${authorId}: ${data.title}`;
    title = data.title;
    description = 'Alguien que sigues ha creado un nuevo evento.';
    linkLabel = 'Ver evento';
    linkUrl = `https://chubascos.app/e/${data.id}`;
  } else if (data.type === 'event_subscription') {
    subject = `Nueva solicitud para tu evento: ${data.title}`;
    title = data.title;
    description = `${authorId} quiere asistir a tu evento.`;
    linkLabel = 'Gestionar participantes';
    linkUrl = `https://chubascos.app/e/${data.eventId}`;
  }

  const mailOptions = {
    from: `"Chubascos" <${process.env.SMTP_USER}>`,
    to: email,
    subject: subject || `Notificación de Chubascos`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff;">
        <h1 style="color: #6d5dfc;">CHUBASCOS</h1>
        <p>${description}</p>
        <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
        <h2>${title}</h2>
        ${data.type !== 'event_subscription' ? `<p>Por: ${authorId}</p>` : ''}
        <a href="${linkUrl}" style="display: inline-block; background-color: #6d5dfc; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">${linkLabel}</a>
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
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff;">
        <h1 style="color: #6d5dfc;">CHUBASCOS</h1>
        <p>Lluvias repentinas dejando charcos.</p>
        <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
        <p>Tu código de acceso es:</p>
        <div style="background-color: #1a1a1a; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #6d5dfc;">
          ${otp}
        </div>
        <p style="margin-top: 20px; color: #888; font-size: 14px;">Este código expirará en 10 minutos.</p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}
