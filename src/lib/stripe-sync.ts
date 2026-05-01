import { adminDb } from '@/lib/firebase-admin';
import { stripe, getTierFromPriceId, getTierFromStripeIdentifiers, mapStripeStatusToLocal } from '@/lib/stripe';
import { entitlementsFromTier, getStripeSubscriptionPeriod } from './subscription-access';
import type Stripe from 'stripe';
import type { SubscriptionTier } from './subscription-plans';

function resolveTierFromSubscription(
  sub: Stripe.Subscription,
  sessionMetadata?: Record<string, string | null>
): SubscriptionTier {
  const tierFromMeta = String(sub.metadata?.planId || sessionMetadata?.planId || '') as SubscriptionTier;
  if (tierFromMeta === 'starter' || tierFromMeta === 'pro' || tierFromMeta === 'elite') return tierFromMeta;

  const priceId = sub.items.data[0]?.price?.id || '';
  const productId = String(sub.items.data[0]?.price?.product || '');
  const byPrice = getTierFromPriceId(priceId);
  if (byPrice !== 'free') return byPrice;
  return getTierFromStripeIdentifiers(priceId, productId);
}

export async function syncVendorSubscriptionFromStripe(params: {
  uid: string;
  subscription: Stripe.Subscription;
  stripeCustomerId?: string;
  sessionMetadata?: Record<string, string | null>;
}) {
  const { uid, subscription, stripeCustomerId, sessionMetadata } = params;
  const tier = resolveTierFromSubscription(subscription, sessionMetadata);
  const status = mapStripeStatusToLocal(subscription.status);
  const period = getStripeSubscriptionPeriod(subscription);
  const entitlements = entitlementsFromTier(status === 'active' ? tier : 'free');

  await adminDb.collection('vendors').doc(uid).set({
    subscriptionTier: status === 'active' ? tier : 'free',
    subscriptionStatus: status,
    subscriptionProvider: 'stripe',
    subscriptionCurrentPeriodStart: period.periodStart,
    subscriptionCurrentPeriodEnd: period.periodEnd,
    subscriptionCancelAt: period.cancelAt,
    subscriptionCancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    subscriptionEntitlements: entitlements,
    stripeSubscriptionId: subscription.id,
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return { tier, status, period };
}

export async function reconcileVendorStripeSubscription(uid: string): Promise<{
  ok: boolean;
  reason?: string;
  tier?: SubscriptionTier;
  status?: string;
}> {
  const vendorSnap = await adminDb.collection('vendors').doc(uid).get();
  const vendor = vendorSnap.data() as any;
  const stripeCustomerId = String(vendor?.stripeCustomerId || '');
  if (!stripeCustomerId) return { ok: false, reason: 'no_customer' };

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'all',
    limit: 20,
  });

  const preferred = subscriptions.data.find((s) => s.status === 'active' || s.status === 'trialing')
    || subscriptions.data.find((s) => s.status === 'past_due' || s.status === 'unpaid')
    || subscriptions.data.find((s) => s.status === 'canceled')
    || subscriptions.data[0];

  if (!preferred) return { ok: false, reason: 'no_subscription' };

  const result = await syncVendorSubscriptionFromStripe({
    uid,
    subscription: preferred,
    stripeCustomerId,
  });
  return { ok: true, tier: result.tier, status: result.status };
}
