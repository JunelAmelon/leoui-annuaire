import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getListingService } from '@/lib/market/server';
import { validateListingPatch } from '@/lib/market/validation';
import { loadPublicSeller } from '@/lib/market/seller-public';

// GET /api/market/listings/[id] — détail public (id ou slug, +1 vue).
// Inclut le sous-ensemble public du profil vendeur (CDC §2.6).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const listing = await getListingService().getPublic(params.id);

    const seller = await loadPublicSeller(adminDb, adminAuth, listing.seller_id);

    return NextResponse.json({ ok: true, listing, seller });
  } catch (e) {
    return errorResponse(e);
  }
}

// PATCH /api/market/listings/[id] — modification propriétaire.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    const patch = validateListingPatch(await req.json());
    const listing = await getListingService().update(decoded.uid, params.id, patch);
    return NextResponse.json({ ok: true, listing });
  } catch (e) {
    return errorResponse(e);
  }
}

// DELETE /api/market/listings/[id] — suppression (soft-delete 'removed').
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await requireAuth(req);
    await getListingService().remove(decoded.uid, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
