import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { consumeRateLimit } from '@/lib/rate-limit';
import { AdminPlaylistRepository } from '@/features/playlist/repositories/admin-playlist.repository';
import { computePlaylistStats } from '@/features/playlist/domain/playlist-rules';

export const dynamic = 'force-dynamic';

const repository = new AdminPlaylistRepository();

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params?.token;
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    // Rate-limit : 60 requêtes par minute par token
    const safeKey = `dj_token_${token}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
    const allowed = await consumeRateLimit(adminDb, safeKey, Date.now(), {
      limit: 60,
      windowMs: 60_000,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes, veuillez patienter un instant.' },
        { status: 429 }
      );
    }

    const playlist = await repository.getByDjToken(token);
    if (!playlist) {
      return NextResponse.json(
        { error: 'Briefing DJ introuvable ou lien d’accès révoqué.' },
        { status: 404 }
      );
    }

    const [tracks, eventInfo] = await Promise.all([
      repository.listTracksByEventId(playlist.event_id),
      repository.getEventInfo(playlist.event_id),
    ]);

    const stats = computePlaylistStats(tracks);

    return NextResponse.json(
      {
        ok: true,
        playlist,
        tracks,
        stats,
        event: eventInfo,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Erreur API /api/playlist/[token]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
