import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';

// POST — marque la conversation comme lue (compteur à zéro + accusé « vu »).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    await getMessagingService().markRead(decoded.uid, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
