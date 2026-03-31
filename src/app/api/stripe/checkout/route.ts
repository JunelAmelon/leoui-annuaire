import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';
import type { SubscriptionTier } from '@/lib/subscription-plans';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { planId } = await req.json();
    const priceId = STRIPE_PRICE_IDS[planId as Exclude<SubscriptionTier, 'free'>];
    if (!priceId) return NextResponse.json({ ok: false, error: 'Plan invalide ou prix non configuré' }, { status: 400 });

    const vendorSnap = await adminDb.collection('vendors').doc(uid).get();
    const vendor = vendorSnap.data() as any;
    if (!vendor) return NextResponse.json({ ok: false, error: 'Prestataire introuvable' }, { status: 404 });

    let stripeCustomerId: string = vendor.stripeCustomerId || '';

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: decoded.email || vendor.email || '',
        name: vendor.name || decoded.name || '',
        metadata: { uid, vendorId: uid },
      });
      stripeCustomerId = customer.id;
      await adminDb.collection('vendors').doc(uid).set(
        { stripeCustomerId },
        { merge: true }
      );
    }

    const existingSubId: string = vendor.stripeSubscriptionId || '';
    if (existingSubId) {
      try {
        const existingSub = await stripe.subscriptions.retrieve(existingSubId);
        if (existingSub.status === 'active' || existingSub.status === 'trialing') {
          const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${APP_URL}/espace-prestataire/abonnement`,
          });
          return NextResponse.json({ ok: true, url: session.url, portal: true });
        }
      } catch { /* sub may no longer exist */ }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/espace-prestataire/abonnement?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/espace-prestataire/abonnement?canceled=true`,
      subscription_data: {
        metadata: { uid, vendorId: uid, planId },
      },
      metadata: { uid, vendorId: uid, planId },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error('[stripe/checkout]', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
