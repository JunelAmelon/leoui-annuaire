import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';

// POST — envoi d'un message. Corps : { body?, attachments?, client_id }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const input = await req.json();
    const { message, created } = await getMessagingService().sendMessage(decoded.uid, params.id, input);
    return NextResponse.json({ ok: true, message }, { status: created ? 201 : 200 });
  } catch (e) {
    return errorResponse(e);
  }
}
