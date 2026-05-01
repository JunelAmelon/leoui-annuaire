import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';
import { syncVendorSubscriptionFromStripe } from '@/lib/stripe-sync';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ ok: false, error: 'sessionId manquant' }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(String(sessionId));
    if (!session || session.mode !== 'subscription') {
      return NextResponse.json({ ok: false, error: 'Session Stripe invalide' }, { status: 400 });
    }

    const metadataUid = String(session.metadata?.uid || '');
    if (metadataUid && metadataUid !== uid) {
      return NextResponse.json({ ok: false, error: 'Session non autorisée' }, { status: 403 });
    }

    const subId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || '';
    if (!subId) return NextResponse.json({ ok: false, error: 'Abonnement non trouvé' }, { status: 400 });

    const sub = await stripe.subscriptions.retrieve(subId);
    const result = await syncVendorSubscriptionFromStripe({
      uid,
      subscription: sub,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
      sessionMetadata: session.metadata as Record<string, string | null> | undefined,
    });

    return NextResponse.json({ ok: true, tier: result.tier, status: result.status, period: result.period });
  } catch (e: any) {
    console.error('[stripe/sync-session]', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
