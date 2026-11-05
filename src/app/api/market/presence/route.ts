import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';

// POST — battement de présence, envoyé périodiquement par l'espace Market ouvert.
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    await getMessagingService().heartbeat(decoded.uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
