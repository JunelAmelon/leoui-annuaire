import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { renderEmailTemplate } from '@/lib/email-template';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, text } = body as {
      to: string;
      subject: string;
      html?: string;
      text?: string;
    };

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Champs requis manquants (to, subject, html|text)' }, { status: 400 });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ error: 'Variables GMAIL_USER / GMAIL_APP_PASSWORD non configurées' }, { status: 503 });
    }

    await transporter.sendMail({
      from: `"LeOui" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: html || `<p>${text}</p>`,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[send-email]', err);
    return NextResponse.json({ error: err.message || 'Erreur envoi email' }, { status: 500 });
  }
}
