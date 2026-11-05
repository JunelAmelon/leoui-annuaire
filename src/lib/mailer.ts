// Envoi d'email côté serveur (nodemailer / Gmail). Server-only.
// Ne throw jamais : renvoie false si la configuration manque ou si l'envoi échoue.

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export async function sendMailServer(params: { to: string; subject: string; html: string; text?: string }): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass || !params.to) return false;
  try {
    transporter ??= nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await transporter.sendMail({ from: `"LeOui" <${user}>`, ...params });
    return true;
  } catch (err) {
    console.error('[mailer]', err);
    return false;
  }
}
