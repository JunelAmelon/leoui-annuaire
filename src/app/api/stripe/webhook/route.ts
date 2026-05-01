import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';
import { syncVendorSubscriptionFromStripe } from '@/lib/stripe-sync';
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
        await syncVendorSubscriptionFromStripe({
          uid,
          subscription: sub,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id || '',
          sessionMetadata: session.metadata as Record<string, string | null> | undefined,
        });
        await adminDb.collection('vendors').doc(uid).set({
          paypalSubscriptionId: null,
          pendingPaypalSubscriptionId: null,
          pendingPaypalPlanId: null,
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
              subscriptionEntitlements: {
                canBeListed: true,
                canReceiveLeads: true,
                boostedRanking: false,
                homepageHighlight: false,
                prioritySupport: false,
                analyticsLevel: 'none',
              },
              subscriptionCurrentPeriodStart: null,
              subscriptionCurrentPeriodEnd: null,
              subscriptionCancelAt: null,
              subscriptionCancelAtPeriodEnd: false,
              stripeSubscriptionId: null,
              subscriptionProvider: 'stripe',
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
          break;
        }
        await adminDb.collection('vendors').doc(uid).set({
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
          subscriptionEntitlements: {
            canBeListed: true,
            canReceiveLeads: true,
            boostedRanking: false,
            homepageHighlight: false,
            prioritySupport: false,
            analyticsLevel: 'none',
          },
          subscriptionCurrentPeriodStart: null,
          subscriptionCurrentPeriodEnd: null,
          subscriptionCancelAt: null,
          subscriptionCancelAtPeriodEnd: false,
          stripeSubscriptionId: null,
          subscriptionProvider: 'stripe',
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
  await syncVendorSubscriptionFromStripe({
    uid,
    subscription: sub,
  });
}
