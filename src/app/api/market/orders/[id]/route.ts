import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getOrderService } from '@/lib/market/server';
import { ValidationError } from '@/lib/market/errors';
import { executeSellerTransfer, isPspEnabled } from '@/lib/market/psp';

/**
 * Libère les fonds vers le compte Connect du vendeur (séquestre réel).
 * Appelé après confirmReceipt/confirmPickup/arbitrage vendeur.
 * - Vendeur onboardé → transfer Stripe + payout 'paid'
 * - Vendeur non onboardé → payout reste 'requested' (payé quand onboarding fini)
 * - Mode démo (pas de PSP) → payout reste 'requested'
 */
async function settlePayout(order: { seller_id: string; id: string }, payout: { id: string; amount: number }) {
  if (!isPspEnabled()) return { settled: false as const };
  const sellerSnap = await adminDb.collection('market_seller_profiles').doc(order.seller_id).get();
  const accountId = sellerSnap.data()?.psp_account_id as string | undefined;
  if (!accountId) return { settled: false as const };

  try {
    const transferId = await executeSellerTransfer({
      payoutId: payout.id,
      sellerConnectId: accountId,
      amountEur: payout.amount,
      orderId: order.id,
    });
    await adminDb.collection('market_payouts').doc(payout.id).set(
      { payout_status: 'executed', psp_payout_ref: transferId, executed_at: new Date().toISOString() },
      { merge: true }
    );
    return { settled: true as const, transfer_id: transferId };
  } catch (e) {
    // Ne pas faire échouer la confirmation si le transfer plante :
    // le payout reste 'requested' et pourra être rejoué par l'admin.
    console.error('[psp] transfer failed:', e);
    return { settled: false as const };
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const order = await getOrderService().getOrderById(decoded.uid, params.id);
    return NextResponse.json({ ok: true, order });
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH /api/market/orders/[id] — Deux actions possibles :
// 1. Vendeur expédie : { action: 'ship', carrier: string, tracking_number: string }
// 2. Acheteur confirme réception : { action: 'confirm_receipt' }
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const body = await req.json();

    if (body.action === 'ship') {
      const carrier = typeof body.carrier === 'string' ? body.carrier.trim() : '';
      const trackingNumber = typeof body.tracking_number === 'string' ? body.tracking_number.trim() : '';

      if (!carrier || !trackingNumber) {
        throw new ValidationError('Le transporteur et le numéro de suivi sont obligatoires pour expédier');
      }

      const order = await getOrderService().shipOrder(decoded.uid, {
        order_id: params.id,
        carrier,
        tracking_number: trackingNumber,
      });

      return NextResponse.json({ ok: true, order });
    }

    if (body.action === 'confirm_receipt') {
      const { order, payout } = await getOrderService().confirmReceipt(decoded.uid, params.id);
      const settlement = await settlePayout(order, payout);
      return NextResponse.json({ ok: true, order, payout, settlement });
    }

    if (body.action === 'confirm_pickup') {
      const code = typeof body.pickup_code === 'string' ? body.pickup_code.trim() : '';
      if (!code) throw new ValidationError('Le code de remise est obligatoire');
      const { order, payout } = await getOrderService().confirmPickup(decoded.uid, params.id, code);
      const settlement = await settlePayout(order, payout);
      return NextResponse.json({ ok: true, order, payout, settlement });
    }

    throw new ValidationError('Action non reconnue');
  } catch (e) {
    return errorResponse(e);
  }
}
