import Stripe from 'stripe';
import type { SubscriptionTier } from './subscription-plans';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover' as any,
});

export const STRIPE_PRICE_IDS: Record<Exclude<SubscriptionTier, 'free'>, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  elite: process.env.STRIPE_PRICE_ELITE || '',
};

export function getTierFromPriceId(priceId: string): SubscriptionTier {
  for (const [key, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id && id === priceId) return key as SubscriptionTier;
  }
  return 'free';
}

export function getTierFromStripeIdentifiers(priceId: string, productId: string): SubscriptionTier {
  for (const [key, configured] of Object.entries(STRIPE_PRICE_IDS)) {
    if (!configured) continue;
    if (configured === priceId || configured === productId) return key as SubscriptionTier;
  }
  return 'free';
}

export function mapStripeStatusToLocal(
  stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'inactive' {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') return 'past_due';
  if (stripeStatus === 'canceled') return 'canceled';
  return 'inactive';
}
