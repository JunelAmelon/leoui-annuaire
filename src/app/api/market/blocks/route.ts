import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getMessagingService } from '@/lib/market/server';
import { ValidationError } from '@/lib/market/errors';

// POST — bloque ou débloque un utilisateur. Corps : { user_id, blocked: boolean }
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const { user_id, blocked } = await req.json();
    if (typeof user_id !== 'string' || !user_id || typeof blocked !== 'boolean') {
      throw new ValidationError('Requête invalide', { user_id: 'Requis' });
    }
    await getMessagingService().setBlock(decoded.uid, user_id, blocked);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
