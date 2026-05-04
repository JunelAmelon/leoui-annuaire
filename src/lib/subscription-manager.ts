/**
 * Subscription Manager - Gestion multi-provider (Stripe + PayPal)
 * 
 * Règles métier principales:
 * - Un seul abonnement actif à la fois
 * - Annulation automatique de l'ancien abonnement lors d'un nouveau
 * - Synchro DB ↔ Providers via webhooks
 */

import { adminDb } from './firebase-admin';
import { stripe } from './stripe';

export type SubscriptionProvider = 'stripe' | 'paypal';

export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'expired' 
  | 'pending' 
  | 'paused'
  | 'unpaid';

export interface Subscription {
  id: string;
  userId: string;
  provider: SubscriptionProvider;
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  tier?: string;
  startDate: Date;
  endDate?: Date;
  canceledAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionConflictResult {
  previousSubscription: Subscription | null;
  action: 'none' | 'canceled' | 'scheduled_cancel';
  message: string;
}

/**
 * Récupère l'abonnement actif d'un utilisateur
 */
export async function getActiveSubscription(userId: string): Promise<Subscription | null> {
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', 'in', ['active', 'past_due', 'pending'])
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Subscription;
}

/**
 * Récupère tous les abonnements d'un utilisateur (historique)
 */
export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
}

/**
 * Vérifie et résout les conflits d'abonnement
 * Annule l'ancien abonnement si un nouveau est créé
 */
export async function resolveSubscriptionConflict(
  userId: string,
  newProvider: SubscriptionProvider,
  immediate: boolean = true
): Promise<SubscriptionConflictResult> {
  const activeSub = await getActiveSubscription(userId);

  if (!activeSub) {
    return {
      previousSubscription: null,
      action: 'none',
      message: 'Aucun abonnement actif trouvé',
    };
  }

  // Même provider - gérer l'upgrade/downgrade interne
  if (activeSub.provider === newProvider) {
    return {
      previousSubscription: activeSub,
      action: 'none',
      message: `Même provider (${newProvider}) - gestion interne`,
    };
  }

  // Providers différents - annuler l'ancien
  try {
    if (activeSub.provider === 'stripe') {
      await cancelStripeSubscription(activeSub.providerSubscriptionId, immediate);
    } else if (activeSub.provider === 'paypal') {
      // PayPal nécessite une approche différente - via API ou portail
      await cancelPayPalSubscription(activeSub.providerSubscriptionId);
    }

    // Mettre à jour le statut dans la DB
    await adminDb.collection('subscriptions').doc(activeSub.id).update({
      status: immediate ? 'canceled' : 'active',
      cancelAtPeriodEnd: !immediate,
      canceledAt: immediate ? new Date() : null,
      updatedAt: new Date(),
    });

    return {
      previousSubscription: activeSub,
      action: immediate ? 'canceled' : 'scheduled_cancel',
      message: `Abonnement ${activeSub.provider} annulé`,
    };
  } catch (error) {
    console.error('[SubscriptionManager] Erreur annulation:', error);
    throw new Error(`Impossible d'annuler l'abonnement existant: ${error}`);
  }
}

/**
 * Annule un abonnement Stripe
 */
async function cancelStripeSubscription(subscriptionId: string, immediate: boolean): Promise<void> {
  try {
    if (immediate) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }
  } catch (error: any) {
    // Subscription déjà annulée ou inexistante
    if (error?.code === 'resource_missing') {
      console.log('[SubscriptionManager] Stripe subscription déjà supprimée');
      return;
    }
    throw error;
  }
}

/**
 * Annule un abonnement PayPal
 * Note: PayPal ne permet pas d'annuler via API facilement, 
 * on marque comme canceled et on laisse le webhook confirmer
 */
async function cancelPayPalSubscription(subscriptionId: string): Promise<void> {
  // La vraie annulation se fait via l'API PayPal ou le portail client
  // On met à jour notre DB et on attend le webhook de confirmation
  console.log('[SubscriptionManager] Marquage PayPal subscription comme canceled:', subscriptionId);
}

/**
 * Crée un nouvel enregistrement d'abonnement
 */
export async function createSubscription(
  subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Subscription> {
  const now = new Date();
  const data = {
    ...subscription,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await adminDb.collection('subscriptions').add(data);
  
  return {
    id: docRef.id,
    ...data,
  };
}

/**
 * Met à jour un abonnement existant
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<Omit<Subscription, 'id' | 'createdAt'>>
): Promise<void> {
  await adminDb.collection('subscriptions').doc(subscriptionId).update({
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Synchronise le statut d'abonnement depuis Stripe
 */
export async function syncStripeSubscription(
  userId: string,
  stripeSubscription: any
): Promise<Subscription | null> {
  const subscriptionId = stripeSubscription.id;
  
  // Chercher l'abonnement existant
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('providerSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  const status = mapStripeStatus(stripeSubscription.status);
  const data: any = {
    userId,
    provider: 'stripe' as const,
    providerSubscriptionId: subscriptionId,
    status,
    tier: stripeSubscription.metadata?.planId || stripeSubscription.metadata?.tier,
    currentPeriodStart: stripeSubscription.current_period_start 
      ? new Date(stripeSubscription.current_period_start * 1000) 
      : undefined,
    currentPeriodEnd: stripeSubscription.current_period_end 
      ? new Date(stripeSubscription.current_period_end * 1000) 
      : undefined,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end || false,
    canceledAt: stripeSubscription.canceled_at 
      ? new Date(stripeSubscription.canceled_at * 1000) 
      : undefined,
    metadata: stripeSubscription.metadata || {},
    updatedAt: new Date(),
  };

  if (snapshot.empty) {
    // Créer nouvel abonnement
    const newSub = await createSubscription({
      ...data,
      startDate: new Date(stripeSubscription.start_date * 1000 || Date.now()),
    });
    return newSub;
  } else {
    // Mettre à jour existant
    const doc = snapshot.docs[0];
    await updateSubscription(doc.id, data);
    return { id: doc.id, ...doc.data(), ...data } as Subscription;
  }
}

/**
 * Synchronise le statut d'abonnement depuis PayPal
 */
export async function syncPayPalSubscription(
  userId: string,
  paypalSubscription: any
): Promise<Subscription | null> {
  const subscriptionId = paypalSubscription.id;
  
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('providerSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  const status = mapPayPalStatus(paypalSubscription.status);
  const data: any = {
    userId,
    provider: 'paypal' as const,
    providerSubscriptionId: subscriptionId,
    status,
    tier: paypalSubscription.plan_id, // À mapper vers votre nomenclature
    currentPeriodStart: paypalSubscription.start_time 
      ? new Date(paypalSubscription.start_time) 
      : undefined,
    currentPeriodEnd: paypalSubscription.billing_info?.next_billing_time 
      ? new Date(paypalSubscription.billing_info.next_billing_time) 
      : undefined,
    metadata: {
      planId: paypalSubscription.plan_id,
      subscriberId: paypalSubscription.subscriber?.payer_id,
    },
    updatedAt: new Date(),
  };

  if (snapshot.empty) {
    const newSub = await createSubscription({
      ...data,
      startDate: new Date(paypalSubscription.start_time || Date.now()),
    });
    return newSub;
  } else {
    const doc = snapshot.docs[0];
    await updateSubscription(doc.id, data);
    const existing = doc.data() as any;
    return { 
      id: doc.id,
      startDate: existing.startDate,
      createdAt: existing.createdAt,
      ...data 
    } as Subscription;
  }
}

/**
 * Mappe les statuts Stripe vers nos statuts internes
 */
function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    'active': 'active',
    'canceled': 'canceled',
    'incomplete': 'pending',
    'incomplete_expired': 'expired',
    'past_due': 'past_due',
    'paused': 'paused',
    'trialing': 'active',
    'unpaid': 'unpaid',
  };
  return mapping[stripeStatus] || 'pending';
}

/**
 * Mappe les statuts PayPal vers nos statuts internes
 */
function mapPayPalStatus(paypalStatus: string): SubscriptionStatus {
  const mapping: Record<string, SubscriptionStatus> = {
    'APPROVAL_PENDING': 'pending',
    'APPROVED': 'active',
    'ACTIVE': 'active',
    'SUSPENDED': 'paused',
    'CANCELLED': 'canceled',
    'EXPIRED': 'expired',
  };
  return mapping[paypalStatus] || 'pending';
}

/**
 * Nettoie les anciens abonnements actifs (sécurité)
 * À appeler lors de la création d'un nouvel abonnement
 */
export async function cleanupActiveSubscriptions(
  userId: string,
  exceptSubscriptionId: string
): Promise<void> {
  const snapshot = await adminDb
    .collection('subscriptions')
    .where('userId', '==', userId)
    .where('status', 'in', ['active', 'past_due', 'pending'])
    .get();

  const batch = adminDb.batch();
  let hasUpdates = false;

  snapshot.docs.forEach(doc => {
    if (doc.id !== exceptSubscriptionId) {
      batch.update(doc.ref, {
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      });
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    await batch.commit();
    console.log('[SubscriptionManager] Nettoyé', snapshot.docs.length - 1, 'anciens abonnements pour', userId);
  }
}
