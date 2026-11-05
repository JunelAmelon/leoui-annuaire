import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';

// POST /api/market/conversations — premier contact depuis une annonce ou un profil vendeur.
// Corps : { listing_id | seller_id, body?, attachments?, client_id }
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const input = await req.json();
    const { conversation, message, created } = await getMessagingService().startConversation(decoded.uid, input);
    return NextResponse.json({ ok: true, conversation, message }, { status: created ? 201 : 200 });
  } catch (e) {
    return errorResponse(e);
  }
}
