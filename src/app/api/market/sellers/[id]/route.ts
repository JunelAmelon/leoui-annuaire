import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { errorResponse } from '@/lib/api-auth';
import { NotFoundError } from '@/lib/market/errors';
import { loadPublicSeller } from '@/lib/market/seller-public';

// GET /api/market/sellers/[id] — profil vendeur public (visiteurs non connectés inclus).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const seller = await loadPublicSeller(adminDb, adminAuth, params.id);
    if (!seller) throw new NotFoundError('Vendeur introuvable');
    return NextResponse.json({ ok: true, seller });
  } catch (e) {
    return errorResponse(e);
  }
}
