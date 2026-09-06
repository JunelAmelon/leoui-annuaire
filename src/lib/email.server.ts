import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Envoi d'email côté serveur (API routes, webhooks).
 * Non-bloquant : log l'erreur et retourne false au lieu de throw.
 */
export async function sendEmailServer(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<boolean> {
  try {
    if (!params.to) return false;
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn('[email] GMAIL_USER / GMAIL_APP_PASSWORD non configurés');
      return false;
    }
    await transporter.sendMail({
      from: `"LeOui" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err);
    return false;
  }
}

/** Email de l'admin (notifications internes). Fallback sur GMAIL_USER. */
export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || process.env.GMAIL_USER || '';
}
