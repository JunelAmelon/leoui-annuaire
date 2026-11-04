import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { TooManyRequestsError, ValidationError } from '@/lib/market/errors';
import { consumeRateLimit } from '@/lib/rate-limit';
import { sendMailServer } from '@/lib/mailer';

const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
const HOURLY_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 };

// POST /api/send-email — réservé aux utilisateurs connectés.
// Avant : route ouverte à tous (relais d'emails depuis l'adresse du site).
// Désormais : jeton Firebase obligatoire, 30 envois/heure/utilisateur,
// destinataire unique et valide, en-têtes protégés, envois journalisés.
export async function POST(req: NextRequest) {
  try {
    const decoded = await requireAuth(req);

    if (!(await consumeRateLimit(adminDb, `email_${decoded.uid}`, Date.now(), HOURLY_LIMIT))) {
      throw new TooManyRequestsError('Limite d’envoi d’emails atteinte. Réessayez plus tard.');
    }

    const { to, subject, html, text } = (await req.json()) as {
      to?: unknown; subject?: unknown; html?: unknown; text?: unknown;
    };

    if (typeof to !== 'string' || to.length > 254 || !EMAIL_RE.test(to)) {
      throw new ValidationError('Destinataire invalide', { to: 'Une seule adresse email valide attendue' });
    }
    if (typeof subject !== 'string' || !subject.trim() || subject.length > 200 || /[\r\n]/.test(subject)) {
      throw new ValidationError('Objet invalide', { subject: '200 caractères maximum, sans retour à la ligne' });
    }
    const hasHtml = typeof html === 'string' && html.length > 0;
    const hasText = typeof text === 'string' && text.length > 0;
    if (!hasHtml && !hasText) throw new ValidationError('Contenu requis', { html: 'html ou text requis' });
    if ((hasHtml && (html as string).length > 100_000) || (hasText && (text as string).length > 20_000)) {
      throw new ValidationError('Contenu trop volumineux');
    }

    const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sent = await sendMailServer({
      to,
      subject: subject.trim(),
      html: hasHtml ? (html as string) : `<p>${escText(text as string)}</p>`,
      text: hasText ? (text as string) : undefined,
    });
    if (!sent) {
      return NextResponse.json({ ok: false, error: 'Envoi d’email indisponible' }, { status: 503 });
    }

    // Journal minimal pour retrouver l'origine d'un abus.
    adminDb
      .collection('email_log')
      .add({ uid: decoded.uid, to, subject: subject.trim(), at: new Date().toISOString() })
      .catch(() => {});

    return NextResponse.json({ ok: true, success: true });
  } catch (e) {
    return errorResponse(e);
  }
}
