import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getDisputeService } from '@/lib/market/server';
import { ValidationError } from '@/lib/market/errors';

// GET /api/market/disputes — litiges où l'utilisateur est acheteur ou vendeur.
export async function GET(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const disputes = await getDisputeService().listForUser(decoded.uid);
    return NextResponse.json({ ok: true, disputes });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/market/disputes — ouverture par l'acheteur.
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const body = await req.json();
    const orderId = typeof body.order_id === 'string' ? body.order_id.trim() : '';
    if (!orderId) throw new ValidationError('La commande est requise', { order_id: 'Requis' });

    const dispute = await getDisputeService().open(decoded.uid, {
      order_id: orderId,
      reason: body.reason,
      description: body.description,
    });
    return NextResponse.json({ ok: true, dispute }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
