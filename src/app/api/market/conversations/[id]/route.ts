import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const conversation = await getMessagingService().getConversation(decoded.uid, params.id);
    return NextResponse.json({ ok: true, conversation });
  } catch (e) {
    return errorResponse(e);
  }
}
