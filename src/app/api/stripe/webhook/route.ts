import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { stripe, getTierFromPriceId, mapStripeStatusToLocal } from '@/lib/stripe';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';
  const secret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e: any) {
    console.error('[webhook] signature error:', e.message);
    return NextResponse.json({ error: `Webhook signature invalid: ${e.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;
        const uid = session.metadata?.uid || '';
        if (!uid) break;

        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id || '';
        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price?.id || '';
        const tier = getTierFromPriceId(priceId);
        const status = mapStripeStatusToLocal(sub.status);
        const periodEnd = new Date((sub as any).current_period_end * 1000).toISOString();

        await adminDb.collection('vendors').doc(uid).set({
          subscriptionTier: tier,
          subscriptionStatus: status,
          subscriptionCurrentPeriodEnd: periodEnd,
          stripeSubscriptionId: subId,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.uid || '';
        if (!uid) {
          const snap = await adminDb.collection('vendors')
            .where('stripeSubscriptionId', '==', sub.id).limit(1).get();
          if (!snap.empty) {
            const docId = snap.docs[0].id;
            await updateVendorSubscription(docId, sub);
          }
          break;
        }
        await updateVendorSubscription(uid, sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.uid || '';
        if (!uid) {
          const snap = await adminDb.collection('vendors')
            .where('stripeSubscriptionId', '==', sub.id).limit(1).get();
          if (!snap.empty) {
            await adminDb.collection('vendors').doc(snap.docs[0].id).set({
              subscriptionTier: 'free',
              subscriptionStatus: 'canceled',
              subscriptionCurrentPeriodEnd: null,
              stripeSubscriptionId: null,
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
          break;
        }
        await adminDb.collection('vendors').doc(uid).set({
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
          subscriptionCurrentPeriodEnd: null,
          stripeSubscriptionId: null,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subId: string = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id || '';
        if (!subId) break;
        const snap = await adminDb.collection('vendors')
          .where('stripeSubscriptionId', '==', subId).limit(1).get();
        if (!snap.empty) {
          await adminDb.collection('vendors').doc(snap.docs[0].id).set({
            subscriptionStatus: 'past_due',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
        break;
      }

      default:
        break;
    }
  } catch (e: any) {
    console.error('[webhook] handler error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function updateVendorSubscription(uid: string, sub: Stripe.Subscription) {
  const priceId = sub.items.data[0]?.price?.id || '';
  const tier = getTierFromPriceId(priceId);
  const status = mapStripeStatusToLocal(sub.status);
  const periodEnd = new Date((sub as any).current_period_end * 1000).toISOString();
  await adminDb.collection('vendors').doc(uid).set({
    subscriptionTier: tier,
    subscriptionStatus: status,
    subscriptionCurrentPeriodEnd: periodEnd,
    stripeSubscriptionId: sub.id,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
