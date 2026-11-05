import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getOrderService } from '@/lib/market/server';
import { ValidationError } from '@/lib/market/errors';

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
      return NextResponse.json({ ok: true, order, payout });
    }

    if (body.action === 'confirm_pickup') {
      const code = typeof body.pickup_code === 'string' ? body.pickup_code.trim() : '';
      if (!code) throw new ValidationError('Le code de remise est obligatoire');
      const { order, payout } = await getOrderService().confirmPickup(decoded.uid, params.id, code);
      return NextResponse.json({ ok: true, order, payout });
    }

    throw new ValidationError('Action non reconnue');
  } catch (e) {
    return errorResponse(e);
  }
}
