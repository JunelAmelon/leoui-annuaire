/**
 * Service de gestion des commandes et du séquestre (Escrow) — LeOui Market.
 *
 * Architecture SOLID / DIP :
 *  ─ SRP : ce fichier gère uniquement les règles métier des commandes.
 *    Persistance (Firestore) reçue par injection → testable avec un fake db.
 *  ─ DIP : dépend de `Firestore` (interface Admin SDK), pas d'une implémentation
 *    concrète. L'injection est faite dans server.ts (composition root).
 *  ─ OCP : ajouter un mode de livraison = étendre l'enum DeliveryMode et ajouter
 *    une branche dans createOrder, sans modifier les méthodes existantes.
 *
 * Méthodes exposées par createOrderService(db) :
 *  1. createOrder    — crée commande + paiement, réserve le stock (transaction)
 *  2. shipOrder      — vendeur renseigne transporteur + n° de suivi
 *  3. confirmReceipt — acheteur confirme la réception → libère les fonds (payout)
 *  4. confirmPickup  — vendeur saisit le code de remise → libère les fonds
 *  5. listUserOrders — liste les commandes d'un utilisateur (acheteur ou vendeur)
 *  6. getOrderById   — détail d'une commande (accès restreint aux participants)
 *
 * Règles CDC respectées :
 *  RM-010/011 : réservation atomique du stock (transaction Firestore)
 *  RM-012/013 : seul l'acheteur confirme ; litige actif bloque la libération
 *  RM-016    : history[] horodatée sur chaque commande
 *  RM-019    : commission figée à la création via MARKET_COMMISSION_RATE
 *
 * Note PSP : les références psp_ref / psp_payout_ref sont simulées ('pi_test_…')
 * en attendant l'intégration Stripe Connect ou Mangopay.
 */

import type { Firestore } from 'firebase-admin/firestore';
import {
  MarketListing,
  MarketOrder,
  MarketPayment,
  MarketPayout,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
} from './types';
import { CreateOrderInput, ShipOrderInput } from './order-types';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from './errors';
import { stripUndefined, MARKET_COMMISSION_RATE } from './utils';

export const DEFAULT_COMMISSION_RATE = MARKET_COMMISSION_RATE;

// Générateur de code de remise en main propre à usage unique (ex: 6 chiffres)
function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createOrderService(db: Firestore) {
  const listingsCol = () => db.collection('market_listings');
  const ordersCol = () => db.collection('market_orders');
  const paymentsCol = () => db.collection('market_payments');
  const payoutsCol = () => db.collection('market_payouts');

  return {
    // 1. Initialiser une commande avec réservation de stock (RM-010 / RM-011)
    async createOrder(buyerId: string, input: CreateOrderInput): Promise<{ order: MarketOrder; payment: MarketPayment }> {
      const listingRef = listingsCol().doc(input.listing_id);

      return await db.runTransaction(async (transaction) => {
        const listingSnap = await transaction.get(listingRef);
        if (!listingSnap.exists) {
          throw new NotFoundError('Annonce introuvable');
        }
        const listing = listingSnap.data() as MarketListing;

        if (listing.status !== 'active') {
          throw new ConflictError('Cette annonce n’est plus disponible à la vente (RM-007)');
        }

        if (listing.seller_id === buyerId) {
          throw new ForbiddenError('Vous ne pouvez pas acheter votre propre article');
        }

        const availableQty = listing.quantity - (listing.quantity_reserved || 0);
        if (input.quantity > availableQty) {
          throw new ConflictError(`Quantité demandée (${input.quantity}) supérieure au stock disponible (${availableQty})`);
        }

        if (input.delivery_mode === 'shipping' && !listing.delivery.shipping) {
          throw new ValidationError('Ce vendeur ne propose pas la livraison par colis');
        }
        if (input.delivery_mode === 'pickup' && !listing.delivery.pickup) {
          throw new ValidationError('Ce vendeur ne propose pas la remise en main propre');
        }

        // Calcul des montants
        const itemsTotal = listing.price * input.quantity;
        const shippingCost = input.delivery_mode === 'shipping' ? (listing.delivery.shipping_cost || 0) : 0;
        const serviceFee = Math.round(itemsTotal * 0.05 * 100) / 100; // 5% frais de protection acheteur
        const grandTotal = Math.round((itemsTotal + shippingCost + serviceFee) * 100) / 100;

        // Calcul commission & net vendeur
        const commissionAmount = Math.round(itemsTotal * DEFAULT_COMMISSION_RATE * 100) / 100;
        const sellerNet = Math.round((itemsTotal + shippingCost - commissionAmount) * 100) / 100;

        // Réservation atomique du stock
        transaction.update(listingRef, {
          quantity_reserved: (listing.quantity_reserved || 0) + input.quantity,
          updated_at: new Date().toISOString(),
        });

        const now = new Date().toISOString();
        const orderRef = ordersCol().doc();
        const paymentRef = paymentsCol().doc();

        const pickupCode = input.delivery_mode === 'pickup' ? generatePickupCode() : null;

        const order: MarketOrder = {
          id: orderRef.id,
          listing_id: listing.id,
          listing_snapshot: {
            title: listing.title,
            image: listing.images[0] || '',
            price: listing.price,
          },
          buyer_id: buyerId,
          seller_id: listing.seller_id,
          quantity: input.quantity,
          delivery_mode: input.delivery_mode,
          shipping_address: input.shipping_address ? (input.shipping_address as any) : null,
          pickup_code: pickupCode,
          amounts: {
            items: itemsTotal,
            shipping: shippingCost,
            service_fee: serviceFee,
            total: grandTotal,
          },
          order_status: 'paid', // Simulé comme payé avec succès dans le tunnel de test
          tracking: undefined,
          receipt_confirmed_at: undefined,
          history: [
            { status: 'pending_payment', at: now, by: buyerId },
            { status: 'paid', at: now, by: 'system' },
          ],
          created_at: now,
          updated_at: now,
        };

        const payment: MarketPayment = {
          id: paymentRef.id,
          order_id: orderRef.id,
          buyer_id: buyerId,
          seller_id: listing.seller_id,
          amount: grandTotal,
          currency: 'eur',
          commission_rate: DEFAULT_COMMISSION_RATE,
          commission_amount: commissionAmount,
          seller_net: sellerNet,
          psp: 'stripe_connect',
          psp_ref: `pi_test_${Date.now()}`,
          idempotency_key: `idemp_${orderRef.id}_${Date.now()}`,
          payment_status: 'payout_pending', // L'argent est bloqué sous séquestre !
          events: [{ type: 'payment_confirmed_escrow', at: now }],
          created_at: now,
          updated_at: now,
        };

        // Si tout le stock est vendu
        const remainingQty = listing.quantity - input.quantity;
        if (remainingQty <= 0) {
          transaction.update(listingRef, {
            status: 'sold',
            quantity: 0,
            quantity_reserved: 0,
          });
        } else {
          transaction.update(listingRef, {
            quantity: remainingQty,
            quantity_reserved: Math.max(0, (listing.quantity_reserved || 0) - input.quantity),
          });
        }

        transaction.set(orderRef, stripUndefined(order));
        transaction.set(paymentRef, stripUndefined(payment));

        return { order, payment };
      });
    },

    // 2. Le vendeur renseigne le suivi colis (CDC §4.3.A)
    async shipOrder(sellerId: string, input: ShipOrderInput): Promise<MarketOrder> {
      const orderRef = ordersCol().doc(input.order_id);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists) throw new NotFoundError('Commande introuvable');
      const order = orderSnap.data() as MarketOrder;

      if (order.seller_id !== sellerId) {
        throw new ForbiddenError('Action non autorisée sur cette commande');
      }

      if (order.order_status !== 'paid' && order.order_status !== 'preparing') {
        throw new ConflictError(`Impossible d’expédier une commande au statut : ${order.order_status}`);
      }

      const now = new Date().toISOString();
      const patch = {
        order_status: 'shipped' as OrderStatus,
        tracking: {
          carrier: input.carrier.trim(),
          number: input.tracking_number.trim(),
          shipped_at: now,
        },
        history: [
          ...order.history,
          { status: 'shipped', at: now, by: sellerId },
        ],
        updated_at: now,
      };

      await orderRef.update(patch);
      return { ...order, ...patch };
    },

    // 3. Confirmation de réception par l'acheteur (CDC §5.3 - RM-012, RM-013)
    // Libération des fonds sous séquestre -> création du reversement
    async confirmReceipt(buyerId: string, orderId: string): Promise<{ order: MarketOrder; payout: MarketPayout }> {
      const orderRef = ordersCol().doc(orderId);

      return await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) throw new NotFoundError('Commande introuvable');
        const order = orderSnap.data() as MarketOrder;

        if (order.buyer_id !== buyerId) {
          throw new ForbiddenError('Seul l’acheteur peut confirmer la bonne réception de la commande (RM-012)');
        }

        if (order.order_status === 'disputed') {
          throw new ConflictError('Un litige est en cours : retirez-le avant de confirmer la réception');
        }

        if (order.order_status === 'receipt_confirmed' || order.order_status === 'completed') {
          throw new ConflictError('La réception a déjà été confirmée pour cette commande');
        }

        // Trouver le paiement associé
        const paymentsSnap = await transaction.get(paymentsCol().where('order_id', '==', orderId).limit(1));
        if (paymentsSnap.empty) throw new NotFoundError('Paiement lié introuvable');
        const paymentDoc = paymentsSnap.docs[0];
        const payment = paymentDoc.data() as MarketPayment;

        const now = new Date().toISOString();

        // Créer l'ordre de reversement (Payout)
        const payoutRef = payoutsCol().doc();
        const payout: MarketPayout = {
          id: payoutRef.id,
          payment_id: payment.id,
          order_id: order.id,
          seller_id: order.seller_id,
          amount: payment.seller_net,
          currency: 'eur',
          payout_status: 'requested', // Instruction de virement transmise au PSP
          psp_payout_ref: `tr_test_${Date.now()}`,
          requested_at: now,
          created_at: now,
          updated_at: now,
        };

        // Mettre à jour la commande
        transaction.update(orderRef, {
          order_status: 'completed',
          receipt_confirmed_at: now,
          history: [
            ...order.history,
            { status: 'completed', at: now, by: buyerId },
          ],
          updated_at: now,
        });

        // Mettre à jour le paiement
        transaction.update(paymentDoc.ref, {
          payment_status: 'payout_requested',
          updated_at: now,
        });

        transaction.set(payoutRef, stripUndefined(payout));

        return {
          order: { ...order, order_status: 'completed', receipt_confirmed_at: now },
          payout,
        };
      });
    },

    // 4. Remise en main propre : le vendeur saisit le pickup_code affiché
    // chez l'acheteur → commande complétée + libération des fonds (RM-012 bis).
    async confirmPickup(sellerId: string, orderId: string, pickupCode: string): Promise<{ order: MarketOrder; payout: MarketPayout }> {
      const orderRef = ordersCol().doc(orderId);
      const code = (pickupCode || '').trim();

      return await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) throw new NotFoundError('Commande introuvable');
        const order = orderSnap.data() as MarketOrder;

        if (order.seller_id !== sellerId) {
          throw new ForbiddenError('Seul le vendeur peut confirmer la remise en main propre');
        }
        if (order.delivery_mode !== 'pickup') {
          throw new ValidationError('Cette commande n’est pas en remise en main propre');
        }
        if (order.order_status !== 'paid' && order.order_status !== 'pickup_scheduled') {
          throw new ConflictError(`Impossible de confirmer la remise au statut : ${order.order_status}`);
        }
        if (!order.pickup_code || order.pickup_code !== code) {
          throw new ValidationError('Code de remise incorrect');
        }

        const paymentsSnap = await transaction.get(paymentsCol().where('order_id', '==', orderId).limit(1));
        if (paymentsSnap.empty) throw new NotFoundError('Paiement lié introuvable');
        const paymentDoc = paymentsSnap.docs[0];
        const payment = paymentDoc.data() as MarketPayment;

        const now = new Date().toISOString();
        const payoutRef = payoutsCol().doc();
        const payout: MarketPayout = {
          id: payoutRef.id,
          payment_id: payment.id,
          order_id: order.id,
          seller_id: order.seller_id,
          amount: payment.seller_net,
          currency: 'eur',
          payout_status: 'requested',
          psp_payout_ref: `tr_test_${Date.now()}`,
          requested_at: now,
          created_at: now,
          updated_at: now,
        };

        transaction.update(orderRef, {
          order_status: 'completed',
          receipt_confirmed_at: now,
          history: [...order.history, { status: 'completed', at: now, by: sellerId }],
          updated_at: now,
        });
        transaction.update(paymentDoc.ref, { payment_status: 'payout_requested', updated_at: now });
        transaction.set(payoutRef, stripUndefined(payout));

        return { order: { ...order, order_status: 'completed', receipt_confirmed_at: now }, payout };
      });
    },

    // 5. Consulter les commandes d'un utilisateur (acheteur ou vendeur)
    async listUserOrders(userId: string, role: 'buyer' | 'seller'): Promise<MarketOrder[]> {
      const field = role === 'buyer' ? 'buyer_id' : 'seller_id';
      const snap = await ordersCol().where(field, '==', userId).get();
      return snap.docs
        .map((d) => ({ ...d.data(), id: d.id }) as MarketOrder)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    // 5. Consulter le détail d'une commande
    async getOrderById(userId: string, orderId: string): Promise<MarketOrder> {
      const snap = await ordersCol().doc(orderId).get();
      if (!snap.exists) throw new NotFoundError('Commande introuvable');
      const order = snap.data() as MarketOrder;

      if (order.buyer_id !== userId && order.seller_id !== userId) {
        throw new ForbiddenError('Accès interdit à cette commande');
      }
      return order;
    },
  };
}
