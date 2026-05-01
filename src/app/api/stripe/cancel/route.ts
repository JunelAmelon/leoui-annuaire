import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';
import { entitlementsFromTier } from '@/lib/subscription-access';
import type { SubscriptionTier } from '@/lib/subscription-plans';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const vendorSnap = await adminDb.collection('vendors').doc(uid).get();
    const vendor = vendorSnap.data() as any;
    const subId = String(vendor?.stripeSubscriptionId || '');
    if (!subId) return NextResponse.json({ ok: false, error: 'Aucun abonnement Stripe actif trouvé' }, { status: 400 });

    const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    const periodEnd = new Date((sub as any).current_period_end * 1000).toISOString();
    const periodStart = (sub as any).current_period_start
      ? new Date((sub as any).current_period_start * 1000).toISOString()
      : null;
    const currentTier = ((vendor?.subscriptionTier as SubscriptionTier) || 'free');

    await adminDb.collection('vendors').doc(uid).set({
      subscriptionProvider: 'stripe',
      subscriptionStatus: 'active',
      subscriptionTier: currentTier,
      subscriptionEntitlements: entitlementsFromTier(currentTier),
      subscriptionCurrentPeriodStart: periodStart,
      subscriptionCurrentPeriodEnd: periodEnd,
      subscriptionCancelAt: periodEnd,
      subscriptionCancelAtPeriodEnd: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({
      ok: true,
      message: 'Résiliation programmée à la fin de la période en cours',
      currentPeriodEnd: periodEnd,
    });
  } catch (e: any) {
    console.error('[stripe/cancel]', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
