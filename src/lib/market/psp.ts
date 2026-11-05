/**
 * Adaptateur PSP LeOui Market — Stripe Connect (DIP boundary).
 *
 * Rôle : isoler TOUT appel à Stripe derrière des fonctions métier nommées.
 * Les services (order-service, dispute-service) restent purs DB ; c'est la
 * couche routes qui orchestre métier + PSP.
 *
 * Flow escrow implémenté (séquestre réel) :
 *   1. createCheckoutSession → l'acheteur paie sur la page hébergée Stripe
 *   2. Webhook checkout.session.completed → order-service.createOrder(psp_ref)
 *   3. Les fonds dorment sur le solde Stripe de la PLATEFORME (= le séquestre
 *      légal — Stripe est le tiers de confiance régulé, pas nous)
 *   4. executeSellerTransfer après confirmReceipt/confirmPickup/arbitrage vendeur
 *   5. refundPayment après arbitrage acheteur
 *
 * Architecture (DIP / testabilité) :
 *   - createPspAdapter(stripeClient) → toutes les fonctions injectables en test
 *   - Les exports nommés (createCheckoutSession, …) utilisent le client Stripe
 *     de production — commodité pour les routes de production.
 *
 * Sécurité :
 *  - Montants recalculés côté serveur depuis l'annonce, jamais depuis le client
 *  - IdempotencyKey systématique sur transfer/refund (pas de double mouvement)
 *  - Toutes les sommes en centimes Stripe (integers)
 */

import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { MARKET_COMMISSION_RATE } from './utils';

export { MARKET_COMMISSION_RATE };
export type { Stripe };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Montants en centimes pour l'API Stripe (integers — jamais de virgule). */
export const cents = (eur: number) => Math.round(eur * 100);

/** true si le PSP est configuré (mode live/test Stripe), false = mode démo. */
export const isPspEnabled = (): boolean => Boolean(process.env.STRIPE_SECRET_KEY);

// ── Paramètres ────────────────────────────────────────────────────────────────

export interface MarketCheckoutParams {
  buyerUid: string;
  buyerEmail: string | null;
  listingId: string;
  listingTitle: string;
  /** Montant total calculé côté serveur (euros) — jamais depuis le client. */
  amountEur: number;
  quantity: number;
  deliveryMode: 'shipping' | 'pickup';
  shippingAddress?: Record<string, string>;
}

// ── Factory DIP (pour les tests) ─────────────────────────────────────────────

/**
 * Crée toutes les fonctions PSP à partir d'un client Stripe injecté.
 * En production : createPspAdapter(stripe) = exports nommés.
 * En test : createPspAdapter(fakeStripeClient) = même logique, faux appels.
 */
export function createPspAdapter(s: Stripe) {
  return {
    /**
     * Crée un compte Express pour le vendeur.
     * (transfers uniquement — la plateforme collecte le paiement)
     */
    async createConnectAccount(email: string): Promise<string> {
      const account = await s.accounts.create({
        type: 'express',
        country: 'FR',
        email,
        capabilities: { transfers: { requested: true } },
        metadata: { platform: 'leoui-market' },
      });
      return account.id;
    },

    /** Génère le lien d'onboarding hébergé Stripe (KYC vendeur + RIB). */
    async createOnboardingLink(accountId: string): Promise<string> {
      const link = await s.accountLinks.create({
        account: accountId,
        refresh_url: `${APP_URL}/app/market/mes-ventes?connect=resume`,
        return_url: `${APP_URL}/app/market/mes-ventes?connect=done`,
        type: 'account_onboarding',
      });
      return link.url;
    },

    /** État d'un compte Connect : le vendeur peut-il recevoir des virements ? */
    async getAccountStatus(accountId: string): Promise<{ payouts_enabled: boolean; details_submitted: boolean }> {
      const account = await s.accounts.retrieve(accountId);
      return {
        payouts_enabled: Boolean(account.payouts_enabled),
        details_submitted: Boolean(account.details_submitted),
      };
    },

    /**
     * Crée une Stripe Checkout Session hébergée.
     * Le metadata porte tout le nécessaire pour recréer la commande au webhook.
     * (metadata values = strings ≤ 500 chars — l'adresse tient en JSON compact.)
     */
    async createCheckoutSession(p: MarketCheckoutParams): Promise<string> {
      const session = await s.checkout.sessions.create({
        mode: 'payment',
        customer_email: p.buyerEmail ?? undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: cents(p.amountEur),
              product_data: {
                name: p.listingTitle,
                description: "LeOui Market — séquestre jusqu'à réception confirmée",
              },
            },
          },
        ],
        metadata: {
          kind: 'market_order',
          buyer_uid: p.buyerUid,
          listing_id: p.listingId,
          quantity: String(p.quantity),
          delivery_mode: p.deliveryMode,
          shipping_address: p.shippingAddress ? JSON.stringify(p.shippingAddress) : '',
        },
        // Le PI porte les mêmes métadonnées → traçabilité même hors session.
        payment_intent_data: {
          metadata: {
            kind: 'market_order',
            listing_id: p.listingId,
            buyer_uid: p.buyerUid,
          },
        },
        success_url: `${APP_URL}/app/market/mes-commandes?paid=1`,
        cancel_url: `${APP_URL}/market/achat/${p.listingId}?canceled=1`,
      });
      return session.url!;
    },

    /**
     * Transfère le net vendeur vers son compte Connect.
     * IdempotencyKey = `payout_${payoutId}` → un payout Firestore = un transfer Stripe max.
     */
    async executeSellerTransfer(params: {
      payoutId: string;
      sellerConnectId: string;
      amountEur: number;
      orderId: string;
    }): Promise<string> {
      const transfer = await s.transfers.create(
        {
          amount: cents(params.amountEur),
          currency: 'eur',
          destination: params.sellerConnectId,
          transfer_group: params.orderId,
          metadata: { payout_id: params.payoutId, order_id: params.orderId },
        },
        { idempotencyKey: `payout_${params.payoutId}` }
      );
      return transfer.id;
    },

    /**
     * Rembourse intégralement un PaymentIntent (arbitrage en faveur de l'acheteur).
     * IdempotencyKey = `refund_${orderId}` → pas de double remboursement.
     */
    async refundPayment(params: {
      paymentIntentId: string;
      orderId: string;
    }): Promise<string> {
      const refund = await s.refunds.create(
        {
          payment_intent: params.paymentIntentId,
          metadata: { order_id: params.orderId, reason: 'dispute_resolved_buyer' },
        },
        { idempotencyKey: `refund_${params.orderId}` }
      );
      return refund.id;
    },
  };
}

// ── Exports nommés (production) ── utilisent le client Stripe de production ──

const _prod = createPspAdapter(stripe);

export const createConnectAccount = _prod.createConnectAccount.bind(_prod);
export const createOnboardingLink = _prod.createOnboardingLink.bind(_prod);
export const getAccountStatus = _prod.getAccountStatus.bind(_prod);
export const createCheckoutSession = _prod.createCheckoutSession.bind(_prod);
export const executeSellerTransfer = _prod.executeSellerTransfer.bind(_prod);
export const refundPayment = _prod.refundPayment.bind(_prod);

export default stripe;
