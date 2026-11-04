import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';

type Ctx = { params: { id: string; messageId: string } };

// PATCH — modification du texte (auteur, 10 min). Corps : { body }
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const decoded = await requireAuth(req);
    const { body } = await req.json();
    const message = await getMessagingService().editMessage(decoded.uid, params.id, params.messageId, body);
    return NextResponse.json({ ok: true, message });
  } catch (e) {
    return errorResponse(e);
  }
}

// DELETE — suppression (auteur, 10 min) : le contenu est effacé.
export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const decoded = await requireAuth(req);
    const message = await getMessagingService().deleteMessage(decoded.uid, params.id, params.messageId);
    return NextResponse.json({ ok: true, message });
  } catch (e) {
    return errorResponse(e);
  }
}
