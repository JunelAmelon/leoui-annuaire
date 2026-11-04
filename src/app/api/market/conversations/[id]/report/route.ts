import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';

// POST — signalement d'une conversation. Corps : { reason, comment? }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const input = await req.json();
    await getMessagingService().reportConversation(decoded.uid, params.id, input);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
