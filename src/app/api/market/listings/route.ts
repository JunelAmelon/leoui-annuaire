import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getListingService } from '@/lib/market/server';
import { parsePublicFilters, validateListingInput } from '@/lib/market/validation';
import { ForbiddenError } from '@/lib/market/errors';

// GET /api/market/listings — catalogue public (visiteur non connecté).
// ?mine=1 avec auth → annonces du vendeur connecté.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const service = getListingService();

    if (url.searchParams.get('mine') === '1') {
      const decoded = await requireAuth(req);
      const listings = await service.listMine(decoded.uid);
      return NextResponse.json({ ok: true, listings });
    }

    // ?seller=<uid> → vitrine publique d'un vendeur (annonces actives uniquement).
    const sellerId = url.searchParams.get('seller');
    if (sellerId) {
      const listings = (await service.listMine(sellerId)).filter((l) => l.status === 'active');
      return NextResponse.json({ ok: true, listings });
    }

    const filters = parsePublicFilters(url.searchParams);
    const listings = await service.listPublic(filters);
    return NextResponse.json({ ok: true, listings });
  } catch (e) {
    return errorResponse(e);
  }
}

// POST /api/market/listings — création d'annonce.
// RM-004 : profil vendeur complété obligatoire avant la 1re annonce.
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);

    const profileSnap = await adminDb
      .collection('market_seller_profiles')
      .doc(decoded.uid)
      .get();
    if (!profileSnap.exists) {
      throw new ForbiddenError('Complétez votre profil vendeur avant de publier (RM-004)');
    }

    const input = validateListingInput(await req.json());
    const listing = await getListingService().create(decoded.uid, input);
    return NextResponse.json({ ok: true, listing }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
