import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getTierFromPaypalPlanId, verifyPaypalWebhookSignature } from '@/lib/paypal';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let event: any;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 });
  }

  const verified = await verifyPaypalWebhookSignature(event, req.headers);
  if (!verified) {
    return NextResponse.json({ error: 'Signature webhook PayPal invalide' }, { status: 400 });
  }

  try {
    const eventType = String(event?.event_type || '');
    const resource = event?.resource || {};
    const subscriptionId = String(resource?.id || '');
    const uid = String(resource?.custom_id || '');
    const planId = String(resource?.plan_id || '');

    if (!subscriptionId) return NextResponse.json({ received: true });

    const vendorDocId = uid || await findVendorByPaypalSubscriptionId(subscriptionId);
    if (!vendorDocId) return NextResponse.json({ received: true });

    if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' || eventType === 'BILLING.SUBSCRIPTION.UPDATED') {
      const tier = getTierFromPaypalPlanId(planId);
      const nextBillingTime = resource?.billing_info?.next_billing_time || null;
      await adminDb.collection('vendors').doc(vendorDocId).set({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: nextBillingTime,
        subscriptionProvider: 'paypal',
        paypalSubscriptionId: subscriptionId,
        paypalPlanId: planId,
        pendingPaypalSubscriptionId: null,
        pendingPaypalPlanId: null,
        stripeSubscriptionId: null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    if (
      eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
      eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ||
      eventType === 'BILLING.SUBSCRIPTION.SUSPENDED'
    ) {
      await adminDb.collection('vendors').doc(vendorDocId).set({
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
        subscriptionCurrentPeriodEnd: null,
        subscriptionProvider: 'paypal',
        paypalSubscriptionId: subscriptionId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      await adminDb.collection('vendors').doc(vendorDocId).set({
        subscriptionStatus: 'past_due',
        subscriptionProvider: 'paypal',
        paypalSubscriptionId: subscriptionId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (e: any) {
    console.error('[paypal/webhook] handler error:', e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function findVendorByPaypalSubscriptionId(subscriptionId: string): Promise<string> {
  const snap = await adminDb.collection('vendors')
    .where('paypalSubscriptionId', '==', subscriptionId).limit(1).get();
  if (!snap.empty) return snap.docs[0].id;

  const pendingSnap = await adminDb.collection('vendors')
    .where('pendingPaypalSubscriptionId', '==', subscriptionId).limit(1).get();
  if (!pendingSnap.empty) return pendingSnap.docs[0].id;

  return '';
}
