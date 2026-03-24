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

export async function sendNotificationEmail(email: string, authorId: string, postData: any) {
  const mailOptions = {
    from: `"Chubascos" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Nuevo poema de ${authorId}: ${postData.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #ffffff;">
        <h1 style="color: #6d5dfc;">CHUBASCOS</h1>
        <p>Alguien que sigues ha dejado un nuevo charco.</p>
        <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
        <h2>${postData.title}</h2>
        <p>Por: ${authorId}</p>
        <a href="https://chubascos.app/u/${authorId}/p/${postData.slug}" style="display: inline-block; background-color: #6d5dfc; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Leer poema</a>
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
