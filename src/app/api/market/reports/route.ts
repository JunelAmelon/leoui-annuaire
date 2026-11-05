import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { ValidationError } from '@/lib/market/errors';
import { stripUndefined } from '@/lib/market/utils';

const REPORT_REASONS = [
  'article_interdit',
  'annonce_trompeuse',
  'photos_mensongeres',
  'prix_abusif',
  'autre',
] as const;

// POST /api/market/reports — signalement d'annonce (CDC §2.6 modération).
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const body = await req.json();

    const listingId = typeof body.listing_id === 'string' ? body.listing_id.trim() : '';
    const reason = body.reason;
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 2000) : '';

    if (!listingId) {
      throw new ValidationError('L’annonce signalée est requise', { listing_id: 'Requis' });
    }
    if (!REPORT_REASONS.includes(reason)) {
      throw new ValidationError('Motif de signalement invalide', { reason: 'Motif non reconnu' });
    }

    const reportRef = adminDb.collection('market_reports').doc();
    await reportRef.set(stripUndefined({
      id: reportRef.id,
      listing_id: listingId,
      reporter_id: decoded.uid,
      reason,
      comment: comment || undefined,
      status: 'open',
      created_at: new Date().toISOString(),
    }));

    return NextResponse.json({ ok: true, report_id: reportRef.id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
