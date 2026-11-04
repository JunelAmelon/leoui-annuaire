/**
 * Litiges LeOui Market — CDC §litiges.
 *
 * Architecture SOLID / DIP :
 *  ─ SRP : ce fichier gère uniquement les règles métier des litiges.
 *    Persistance (Firestore) injectée via `db: Firestore` → testable avec un fake.
 *  ─ DIP : le service dépend de l'abstraction `Firestore` (interface Admin SDK),
 *    pas d'une implémentation concrète. L'injection a lieu dans server.ts.
 *  ─ OCP : ajouter un motif ou un statut = modifier uniquement les unions de
 *    types.ts et les labels ici, sans toucher aux méthodes du service.
 *
 * Structure :
 *  1. Constantes et labels (DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS)
 *  2. Règles pures exportées (canOpenDispute, isDisputeActive…) — sans I/O
 *  3. Factory createDisputeService(db) → retourne les méthodes du service
 *     ├─ Méthodes admin  : listAll, getForAdmin, resolve
 *     └─ Méthodes public : open, get, addMessage, withdraw, listForUser
 *
 * Périmètre implémenté :
 *  ✅ Ouverture par l'acheteur
 *  ✅ Échange de messages acheteur / vendeur / admin
 *  ✅ Réponse vendeur → passage en under_review
 *  ✅ Retrait par l'acheteur (→ closed, commande restaurée)
 *  ✅ Arbitrage admin (resolve) : transaction atomique sur dispute + order + payment + payout
 *  ⏳ Remboursement PSP réel : simulé (psp_ref = 'tr_test_…') tant que Stripe Connect /
 *     Mangopay n'est pas sélectionné.
 */

import type { Firestore } from 'firebase-admin/firestore';
import {
  DisputeMessage,
  DisputeReason,
  DisputeStatus,
  MarketDispute,
  MarketOrder,
  MarketPayment,
  MarketPayout,
  OrderStatus,
} from './types';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors';
import { stripUndefined } from './utils';

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  not_received: 'Article non reçu',
  damaged: 'Article endommagé',
  not_as_described: 'Article non conforme à l’annonce',
  wrong_quantity: 'Quantité incorrecte',
  wrong_item: 'Mauvais article reçu',
  pickup_issue: 'Problème lors de la remise en main propre',
  other: 'Autre problème',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Ouvert',
  awaiting_seller: 'En attente du vendeur',
  under_review: 'En cours d’examen',
  resolved_buyer: 'Résolu en faveur de l’acheteur',
  resolved_seller: 'Résolu en faveur du vendeur',
  closed: 'Clôturé',
};

const REASONS = Object.keys(DISPUTE_REASON_LABELS) as DisputeReason[];
const OPENABLE_ORDER_STATUSES: OrderStatus[] = ['paid', 'preparing', 'shipped', 'pickup_scheduled', 'delivered'];
const ACTIVE_STATUSES: DisputeStatus[] = ['open', 'awaiting_seller', 'under_review'];

// ── Règles pures ──────────────────────────────────────────────────────────────

export const canOpenDispute = (order: Pick<MarketOrder, 'order_status'>): boolean =>
  OPENABLE_ORDER_STATUSES.includes(order.order_status);

export const isDisputeActive = (d: Pick<MarketDispute, 'status'>): boolean =>
  ACTIVE_STATUSES.includes(d.status);

export const isValidDisputeReason = (r: unknown): r is DisputeReason =>
  typeof r === 'string' && REASONS.includes(r as DisputeReason);

export function validateDisputeText(raw: unknown, min: number, label: string): string {
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (text.length < min) {
    throw new ValidationError(`${label} : ${min} caractères minimum`, { [label]: `${min} caractères minimum` });
  }
  return text.slice(0, 2000);
}

// ── Service ───────────────────────────────────────────────────────────────────

export function createDisputeService(db: Firestore) {
  const disputes = () => db.collection('market_disputes');
  const orders = () => db.collection('market_orders');
  const nowIso = () => new Date().toISOString();

  const loadForParticipant = async (userId: string, id: string): Promise<MarketDispute> => {
    const snap = await disputes().doc(id).get();
    if (!snap.exists) throw new NotFoundError('Litige introuvable');
    const dispute = { ...(snap.data() as MarketDispute), id: snap.id };
    if (dispute.buyer_id !== userId && dispute.seller_id !== userId) {
      throw new ForbiddenError('Accès interdit à ce litige');
    }
    return dispute;
  };

  return {
    // ── Admin : arbitrage des litiges ─────────────────────────────────────────
    // Réservé aux routes /api/admin/* (rôle vérifié en amont).
    async listAll(status?: string): Promise<MarketDispute[]> {
      const col = disputes();
      const snap = status ? await col.where('status', '==', status).get() : await col.get();
      return snap.docs
        .map((d) => ({ ...(d.data() as MarketDispute), id: d.id }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async getForAdmin(id: string): Promise<MarketDispute> {
      const snap = await disputes().doc(id).get();
      if (!snap.exists) throw new NotFoundError('Litige introuvable');
      return { ...(snap.data() as MarketDispute), id: snap.id };
    },

    // Décision d'arbitrage : 'buyer' → remboursement simulé + commande refunded ;
    // 'seller' → libération des fonds (payout) + commande completed.
    async resolve(
      adminId: string,
      id: string,
      input: { decision: 'buyer' | 'seller'; note: unknown }
    ): Promise<MarketDispute> {
      if (input.decision !== 'buyer' && input.decision !== 'seller') {
        throw new ValidationError('Décision invalide', { decision: 'buyer ou seller attendu' });
      }
      const note = validateDisputeText(input.note, 10, 'Note de résolution');

      const disputeRef = disputes().doc(id);
      const orderRefById = (orderId: string) => orders().doc(orderId);
      const payments = () => db.collection('market_payments');
      const payouts = () => db.collection('market_payouts');

      return db.runTransaction(async (tx) => {
        const disputeSnap = await tx.get(disputeRef);
        if (!disputeSnap.exists) throw new NotFoundError('Litige introuvable');
        const dispute = { ...(disputeSnap.data() as MarketDispute), id: disputeSnap.id };
        if (!isDisputeActive(dispute)) throw new ConflictError('Ce litige est déjà tranché');

        const orderRef = orderRefById(dispute.order_id);
        const orderSnap = await tx.get(orderRef);
        const order = orderSnap.exists ? (orderSnap.data() as MarketOrder) : null;

        const paymentsSnap = await tx.get(
          payments().where('order_id', '==', dispute.order_id).limit(1)
        );
        const paymentDoc = paymentsSnap.empty ? null : paymentsSnap.docs[0];
        const payment = paymentDoc ? (paymentDoc.data() as MarketPayment) : null;

        const now = nowIso();
        const status: DisputeStatus =
          input.decision === 'buyer' ? 'resolved_buyer' : 'resolved_seller';
        const messages = [
          ...dispute.messages,
          { by: adminId, role: 'admin' as const, body: `[Arbitrage] ${note}`, at: now },
        ];

        tx.update(disputeRef, {
          status,
          messages,
          resolution_note: note,
          decided_by: adminId,
          decided_at: now,
          updated_at: now,
        });

        if (order) {
          if (input.decision === 'buyer') {
            // Remboursement de l'acheteur (simulé tant que le PSP n'est pas branché).
            tx.update(orderRef, {
              order_status: 'refunded',
              history: [...order.history, { status: 'refunded', at: now, by: adminId }],
              updated_at: now,
            });
            if (paymentDoc) {
              tx.update(paymentDoc.ref, {
                payment_status: 'refunded',
                events: [
                  ...(payment?.events ?? []),
                  { type: 'refund_executed_dispute', at: now },
                ],
                updated_at: now,
              });
            }
          } else {
            // En faveur du vendeur : même libération que confirmReceipt.
            if (paymentDoc && payment) {
              const payoutRef = payouts().doc();
              tx.set(payoutRef, stripUndefined({
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
              } satisfies MarketPayout));
              tx.update(paymentDoc.ref, { payment_status: 'payout_requested', updated_at: now });
            }
            tx.update(orderRef, {
              order_status: 'completed',
              receipt_confirmed_at: now,
              history: [...order.history, { status: 'completed', at: now, by: adminId }],
              updated_at: now,
            });
          }
        }

        return {
          ...dispute,
          status,
          messages,
          resolution_note: note,
          decided_by: adminId,
          decided_at: now,
          updated_at: now,
        } as MarketDispute;
      });
    },

    // ── Utilisateurs ──────────────────────────────────────────────────────────
    async open(
      buyerId: string,
      input: { order_id: string; reason: unknown; description: unknown }
    ): Promise<MarketDispute> {
      if (!isValidDisputeReason(input.reason)) {
        throw new ValidationError('Motif invalide', { reason: 'Motif non reconnu' });
      }
      const description = validateDisputeText(input.description, 20, 'Description');
      const reason = input.reason;

      const orderRef = orders().doc(input.order_id);
      const disputeRef = disputes().doc();

      return db.runTransaction(async (tx) => {
        const orderSnap = await tx.get(orderRef);
        if (!orderSnap.exists) throw new NotFoundError('Commande introuvable');
        const order = orderSnap.data() as MarketOrder;

        if (order.buyer_id !== buyerId) throw new ForbiddenError('Seul l’acheteur peut ouvrir un litige');
        if (!canOpenDispute(order)) {
          throw new ConflictError('Un litige ne peut plus être ouvert pour cette commande');
        }

        const existing = await tx.get(disputes().where('order_id', '==', input.order_id));
        if (existing.docs.some((d) => isDisputeActive(d.data() as MarketDispute))) {
          throw new ConflictError('Un litige est déjà en cours pour cette commande');
        }

        const now = nowIso();
        const first: DisputeMessage = { by: buyerId, role: 'buyer', body: description, at: now };
        const dispute: MarketDispute = {
          id: disputeRef.id,
          order_id: input.order_id,
          listing_title: order.listing_snapshot?.title ?? '',
          listing_image: order.listing_snapshot?.image,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          opened_by: buyerId,
          reason,
          description,
          evidence: [],
          status: 'awaiting_seller',
          messages: [first],
          created_at: now,
          updated_at: now,
        };

        tx.set(disputeRef, stripUndefined(dispute));
        // Les fonds restent bloqués : le paiement n'est pas touché, et
        // confirmReceipt refuse les commandes en litige.
        tx.update(orderRef, {
          order_status: 'disputed',
          status_before_dispute: order.order_status,
          history: [...order.history, { status: 'disputed', at: now, by: buyerId }],
          updated_at: now,
        });
        return dispute;
      });
    },

    async listForUser(userId: string): Promise<MarketDispute[]> {
      const [asBuyer, asSeller] = await Promise.all([
        disputes().where('buyer_id', '==', userId).get(),
        disputes().where('seller_id', '==', userId).get(),
      ]);
      const byId = new Map<string, MarketDispute>();
      [...asBuyer.docs, ...asSeller.docs].forEach((d) =>
        byId.set(d.id, { ...(d.data() as MarketDispute), id: d.id })
      );
      return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    async get(userId: string, id: string): Promise<MarketDispute> {
      return loadForParticipant(userId, id);
    },

    async addMessage(userId: string, id: string, rawBody: unknown): Promise<MarketDispute> {
      const dispute = await loadForParticipant(userId, id);
      if (!isDisputeActive(dispute)) throw new ConflictError('Ce litige est clos');
      const body = validateDisputeText(rawBody, 2, 'Message');

      const role: DisputeMessage['role'] = userId === dispute.seller_id ? 'seller' : 'buyer';
      const now = nowIso();
      const patch: Partial<MarketDispute> = {
        messages: [...dispute.messages, { by: userId, role, body, at: now }],
        updated_at: now,
      };
      // Première réponse du vendeur : le dossier passe en examen par l'équipe.
      if (role === 'seller') {
        patch.seller_response = dispute.seller_response ?? body;
        patch.status = 'under_review';
      }
      await disputes().doc(id).update(stripUndefined(patch));
      return { ...dispute, ...patch } as MarketDispute;
    },

    async withdraw(buyerId: string, id: string): Promise<MarketDispute> {
      const dispute = await loadForParticipant(buyerId, id);
      if (dispute.buyer_id !== buyerId) throw new ForbiddenError('Seul l’acheteur peut retirer le litige');
      if (!isDisputeActive(dispute)) throw new ConflictError('Ce litige est déjà clos');

      const orderRef = orders().doc(dispute.order_id);
      return db.runTransaction(async (tx) => {
        const orderSnap = await tx.get(orderRef);
        const now = nowIso();
        if (orderSnap.exists) {
          const order = orderSnap.data() as MarketOrder;
          if (order.order_status === 'disputed') {
            const restored = order.status_before_dispute ?? 'paid';
            tx.update(orderRef, {
              order_status: restored,
              history: [...order.history, { status: restored, at: now, by: buyerId }],
              updated_at: now,
            });
          }
        }
        const messages = [
          ...dispute.messages,
          { by: buyerId, role: 'buyer' as const, body: 'Litige retiré par l’acheteur.', at: now },
        ];
        tx.update(disputes().doc(id), { status: 'closed', messages, updated_at: now });
        return { ...dispute, status: 'closed' as const, messages, updated_at: now };
      });
    },
  };
}

export type DisputeService = ReturnType<typeof createDisputeService>;
