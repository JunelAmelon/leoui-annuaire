import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getDisputeService } from '@/lib/market/server';
import { ValidationError } from '@/lib/market/errors';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const dispute = await getDisputeService().get(decoded.uid, params.id);
    return NextResponse.json({ ok: true, dispute });
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH /api/market/disputes/[id]
//  { action: 'message', body }  → message de l'acheteur ou du vendeur
//  { action: 'withdraw' }       → l'acheteur retire son litige
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const body = await req.json();
    const service = getDisputeService();

    if (body.action === 'message') {
      const dispute = await service.addMessage(decoded.uid, params.id, body.body);
      return NextResponse.json({ ok: true, dispute });
    }
    if (body.action === 'withdraw') {
      const dispute = await service.withdraw(decoded.uid, params.id);
      return NextResponse.json({ ok: true, dispute });
    }
    throw new ValidationError('Action non reconnue');
  } catch (e) {
    return errorResponse(e);
  }
}
