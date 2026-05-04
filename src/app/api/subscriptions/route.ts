/**
 * API Subscriptions - Récupérer l'abonnement actif de l'utilisateur
 * Endpoint: GET /api/subscriptions
 */

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getActiveSubscription, getUserSubscriptions } from '@/lib/subscription-manager';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const active = await getActiveSubscription(uid);
    const history = await getUserSubscriptions(uid);

    return NextResponse.json({
      ok: true,
      active,
      history,
      hasMultipleProviders: history.length > 1,
    });
  } catch (e: any) {
    console.error('[api/subscriptions]', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
