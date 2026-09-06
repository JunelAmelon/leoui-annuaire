import { NextRequest, NextResponse } from 'next/server';
import { sendEmailServer, getAdminEmail } from '@/lib/email.server';
import { renderContactFormEmail } from '@/lib/email-template';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Champs requis manquants (name, email, message)' }, { status: 400 });
    }

    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      return NextResponse.json({ error: 'Email admin non configuré' }, { status: 503 });
    }

    const ok = await sendEmailServer({
      to: adminEmail,
      subject: `[Contact LeOui] ${subject || 'Question générale'} — ${name}`,
      html: renderContactFormEmail({ name, email, subject: subject || 'Question générale', message }),
      text: `${name} <${email}> — ${subject || 'Question générale'}\n\n${message}`,
    });

    if (!ok) {
      return NextResponse.json({ error: 'Échec de l\'envoi' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[contact]', err);
    return NextResponse.json({ error: err.message || 'Erreur envoi' }, { status: 500 });
  }
}
