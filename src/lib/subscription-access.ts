import type Stripe from 'stripe';
import type { SubscriptionTier } from './subscription-plans';

export interface SubscriptionEntitlements {
  canBeListed: boolean;
  canReceiveLeads: boolean;
  boostedRanking: boolean;
  homepageHighlight: boolean;
  prioritySupport: boolean;
  analyticsLevel: 'none' | 'basic' | 'advanced';
}

export function entitlementsFromTier(tier: SubscriptionTier): SubscriptionEntitlements {
  if (tier === 'elite') {
    return {
      canBeListed: true,
      canReceiveLeads: true,
      boostedRanking: true,
      homepageHighlight: true,
      prioritySupport: true,
      analyticsLevel: 'advanced',
    };
  }
  if (tier === 'pro') {
    return {
      canBeListed: true,
      canReceiveLeads: true,
      boostedRanking: true,
      homepageHighlight: false,
      prioritySupport: false,
      analyticsLevel: 'advanced',
    };
  }
  if (tier === 'starter') {
    return {
      canBeListed: true,
      canReceiveLeads: true,
      boostedRanking: false,
      homepageHighlight: false,
      prioritySupport: false,
      analyticsLevel: 'basic',
    };
  }
  return {
    canBeListed: true,
    canReceiveLeads: true,
    boostedRanking: false,
    homepageHighlight: false,
    prioritySupport: false,
    analyticsLevel: 'none',
  };
}

export function getStripeSubscriptionPeriod(sub: Stripe.Subscription): {
  periodStart: string | null;
  periodEnd: string | null;
  cancelAt: string | null;
} {
  const periodStartUnix = (sub as any).current_period_start as number | undefined;
  const periodEndUnix = (sub as any).current_period_end as number | undefined;
  const cancelAtUnix = (sub as any).cancel_at as number | undefined;
  return {
    periodStart: periodStartUnix ? new Date(periodStartUnix * 1000).toISOString() : null,
    periodEnd: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
    cancelAt: cancelAtUnix ? new Date(cancelAtUnix * 1000).toISOString() : null,
  };
}
