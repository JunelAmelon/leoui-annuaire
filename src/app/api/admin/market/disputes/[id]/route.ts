/**
 * GET  /api/admin/market/disputes/[id]
 * PATCH /api/admin/market/disputes/[id]
 *
 * Détail et arbitrage d'un litige précis par l'équipe LeOui Market.
 *
 * Architecture (SOLID / DIP) :
 *  - SRP : route = transport uniquement (auth → délégation service → mapping erreur).
 *  - DIP : dépend de DisputeService via getDisputeService() (composition root).
 *    La route n'importe pas Firestore directement.
 *  - OCP : pour ajouter une action (ex: 'add_note'), on étend le PATCH sans
 *    modifier la logique existante — le service gère chaque action.
 *
 * Sécurité :
 *  - requireAdmin() factorisé ici : requiert token Firebase + claim role=admin.
 *  - Les deux verbes HTTP utilisent le même guard.
 *
 * PATCH body :
 *  {
 *    action: 'resolve',            // seule action supportée pour l'instant
 *    decision: 'buyer' | 'seller', // en faveur de qui
 *    note: string                  // note de résolution (min. 10 chars, validée par le service)
 *  }
 *
 *  'buyer'  → dispute.status = 'resolved_buyer',  order = 'refunded', payment = 'refunded'
 *  'seller' → dispute.status = 'resolved_seller', payout créé,        order = 'completed'
 *
 *  La transaction Firestore dans le service garantit l'atomicité.
 *
 * Réponse succès : { ok: true, dispute: MarketDispute }
 * Réponse erreur : { ok: false, error: string, code?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getDisputeService } from '@/lib/market/server';
import { ForbiddenError, ValidationError } from '@/lib/market/errors';
import { executeSellerTransfer, refundPayment, isPspEnabled } from '@/lib/market/psp';

/**
 * Exécute le mouvement d'argent réel après arbitrage (séquestre).
 *  'buyer'  → refund du PaymentIntent (psp_ref réel uniquement — les
 *             paiements pi_test_* de la démo sont ignorés silencieusement)
 *  'seller' → transfer vers le compte Connect du vendeur + payout 'paid'
 * Toute erreur Stripe est loguée sans faire échouer la décision d'arbitrage.
 */
async function settleDispute(decision: 'buyer' | 'seller', orderId: string) {
  if (!isPspEnabled() || !orderId) return;
  try {
    const paySnap = await adminDb
      .collection('market_payments')
      .where('order_id', '==', orderId)
      .limit(1)
      .get();
    if (paySnap.empty) return;
    const payment = paySnap.docs[0].data() as { psp_ref?: string; seller_net?: number; seller_id?: string };

    if (decision === 'buyer') {
      if (payment.psp_ref?.startsWith('pi_') && !payment.psp_ref.startsWith('pi_test_')) {
        await refundPayment({ paymentIntentId: payment.psp_ref, orderId });
      }
    } else {
      const sellerSnap = await adminDb.collection('market_seller_profiles').doc(payment.seller_id!).get();
      const accountId = sellerSnap.data()?.psp_account_id as string | undefined;
      if (!accountId || !payment.seller_net) return;
      const payoutSnap = await adminDb
        .collection('market_payouts')
        .where('order_id', '==', orderId)
        .limit(1)
        .get();
      if (payoutSnap.empty) return;
      const transferId = await executeSellerTransfer({
        payoutId: payoutSnap.docs[0].id,
        sellerConnectId: accountId,
        amountEur: payment.seller_net,
        orderId,
      });
      await payoutSnap.docs[0].ref.set(
        { payout_status: 'executed', psp_payout_ref: transferId, executed_at: new Date().toISOString() },
        { merge: true }
      );
    }
  } catch (e) {
    console.error('[psp] dispute settlement failed:', e);
  }
}

/**
 * Guard réutilisable pour les deux verbes :
 * vérifie le token Firebase et le claim admin.
 * Lève ForbiddenError si le rôle est insuffisant.
 */
async function requireAdmin(req: NextRequest) {
  const decoded = await requireAuth(req);
  if (decoded.role !== 'admin') {
    throw new ForbiddenError('Accès réservé à l\'équipe LeOui');
  }
  return decoded;
}

// ── GET : récupérer le détail complet d'un litige ─────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);

    // Lecture complète sans filtrage participant (admin = accès total)
    const dispute = await getDisputeService().getForAdmin(params.id);

    return NextResponse.json({ ok: true, dispute });
  } catch (e) {
    return errorResponse(e);
  }
}

// ── PATCH : arbitrer (trancher) un litige ─────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentification + rôle admin
    const decoded = await requireAdmin(req);

    // Parsing du corps — seule l'action 'resolve' est reconnue pour l'instant
    const body = await req.json() as { action?: string; decision?: string; note?: string };

    if (body.action !== 'resolve') {
      throw new ValidationError('Action non reconnue — seule "resolve" est supportée');
    }

    // Délégation à dispute-service.resolve() :
    //  - valide la décision et la note
    //  - exécute la transaction atomique (dispute + order + payment + payout)
    //  - enregistre decoded.uid dans decided_by et ajoute un message admin
    const dispute = await getDisputeService().resolve(decoded.uid, params.id, {
      decision: body.decision as 'buyer' | 'seller',
      note: body.note,
    });

    // Mouvement d'argent réel : refund acheteur ou transfer vendeur.
    // Fire-finally : la décision d'arbitrage est actée quoi qu'il arrive.
    await settleDispute(body.decision as 'buyer' | 'seller', dispute.order_id);

    return NextResponse.json({ ok: true, dispute });
  } catch (e) {
    return errorResponse(e);
  }
}
