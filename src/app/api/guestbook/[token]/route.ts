import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { consumeRateLimit } from '@/lib/rate-limit';
import { AdminGuestbookRepository } from '@/features/guestbook/repositories/admin-guestbook.repository';
import { GuestbookService } from '@/features/guestbook/services/guestbook.service';

const repository = new AdminGuestbookRepository();
const service = new GuestbookService(repository);

function getClientKey(request: NextRequest, guestKey?: unknown): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const rawKey = forwarded || (typeof guestKey === 'string' && guestKey.trim()) || 'anon';
  return rawKey.replace(/[^a-zA-Z0-9._:-]/g, '_').slice(0, 64);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const info = await service.getPublicGuestbookInfo(token);
    if (!info) {
      return NextResponse.json(
        { error: 'Livre d’or introuvable ou lien expiré' },
        { status: 404 }
      );
    }

    const entryId = _request.nextUrl.searchParams.get('entry');
    let entryData = null;
    if (entryId) {
      const entry = await service.getEntryForPublicToken(token, entryId);
      if (entry) {
        entryData = {
          id: entry.id,
          guest_name: entry.guest_name,
          type: entry.type,
          duration_sec: entry.duration_sec,
          audio_path: entry.audio_path,
          waveform: entry.waveform,
          body: entry.body,
          created_at: entry.created_at,
        };
      }
    }

    return NextResponse.json({ ...info, entry: entryData });
  } catch (error: any) {
    console.error('Erreur GET /api/guestbook/[token]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const body = await request.json();

    // Anti-spam / Rate-limit : max 10 soumissions par fenêtre de 10 minutes par invité/IP
    const rateKey = `guestbook_${token.slice(0, 24)}_${getClientKey(request, body?.guest_key)}`;
    try {
      const allowed = await consumeRateLimit(adminDb as any, rateKey, Date.now(), {
        limit: 10,
        windowMs: 10 * 60 * 1000,
      });
      if (!allowed) {
        return NextResponse.json(
          { error: 'Trop de messages envoyés récemment. Veuillez patienter quelques minutes.' },
          { status: 429 }
        );
      }
    } catch {
      // Fallback gracieux si la transaction rate-limit n'est pas joignable en environnement local sans credentials
    }

    const type = body.type;

    if (type === 'text') {
      const result = await service.submitTextEntry(token, {
        guest_name: body.guest_name,
        body: body.body,
        guest_key: body.guest_key,
      });
      return NextResponse.json(result, { status: 201 });
    } else if (type === 'audio') {
      const result = await service.submitAudioEntry(token, {
        guest_name: body.guest_name,
        duration_sec: body.duration_sec,
        waveform: body.waveform,
        audio_base64: body.audio_base64,
        mime_type: body.mime_type,
        size_bytes: body.size_bytes,
        guest_key: body.guest_key,
      });
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(
        { error: 'Type d’entrée non valide (attendu: audio ou text)' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Erreur POST /api/guestbook/[token]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors de l’enregistrement du message' },
      { status: 400 }
    );
  }
}
