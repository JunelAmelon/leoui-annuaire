import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { MarketSellerProfile } from '@/lib/market/types';
import { ValidationError } from '@/lib/market/errors';
import { stripUndefined } from '@/lib/market/utils';

// Les badges de confiance ne reflètent que des vérifications réelles :
//  - email  : email_verified du jeton Firebase
//  - phone  : uniquement si phone_verified_at est renseigné (SMS non implémenté → jamais)
function withHonestVerification(
  p: Partial<MarketSellerProfile>,
  emailVerified: boolean
): MarketSellerProfile['verified'] {
  return {
    email: emailVerified,
    phone: Boolean(p.verified?.phone && p.phone_verified_at),
    identity: Boolean(p.verified?.identity),
    payout: Boolean(p.verified?.payout),
  };
}

export async function GET(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const snap = await adminDb.collection('market_seller_profiles').doc(decoded.uid).get();
    if (!snap.exists) return NextResponse.json({ ok: true, profile: null });
    const p = snap.data() as MarketSellerProfile;
    return NextResponse.json({
      ok: true,
      profile: { ...p, verified: withHonestVerification(p, Boolean(decoded.email_verified)) },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

// Création ou mise à jour partielle : seuls les champs présents dans le corps sont modifiés.
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const body = await req.json();

    const docRef = adminDb.collection('market_seller_profiles').doc(decoded.uid);
    const existingSnap = await docRef.get();
    const existing = existingSnap.exists ? (existingSnap.data() as Partial<MarketSellerProfile>) : null;
    const now = new Date().toISOString();

    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : undefined);

    const displayName = str(body.display_name) ?? existing?.display_name ?? '';
    if (displayName.length < 2) {
      throw new ValidationError('Le nom ou pseudo public est requis (au moins 2 caractères)', {
        display_name: 'Nom ou pseudo requis',
      });
    }

    const city = str(body.address?.city) ?? existing?.address?.city ?? '';
    if (!city) {
      throw new ValidationError('La ville est requise pour le profil vendeur', { city: 'Ville requise' });
    }

    const status =
      body.status === 'professionnel' || body.status === 'particulier'
        ? body.status
        : existing?.status ?? 'particulier';

    let photoUrl = existing?.photo_url ?? null;
    if (body.photo_url !== undefined) {
      if (body.photo_url === null || body.photo_url === '') photoUrl = null;
      else if (typeof body.photo_url === 'string' && /^https:\/\//.test(body.photo_url)) photoUrl = body.photo_url;
      else throw new ValidationError('URL de photo invalide', { photo_url: 'URL https attendue' });
    }

    const phone = body.phone !== undefined ? str(body.phone) || null : existing?.phone ?? null;
    const phoneChanged = phone !== (existing?.phone ?? null);

    const base: Partial<MarketSellerProfile> = {
      ...existing,
      phone_verified_at: phoneChanged ? null : existing?.phone_verified_at ?? null,
    };

    const profile: MarketSellerProfile = {
      uid: decoded.uid,
      display_name: displayName,
      status,
      photo_url: photoUrl,
      bio: body.bio !== undefined ? (str(body.bio) || '').slice(0, 500) || null : existing?.bio ?? null,
      phone,
      phone_verified_at: base.phone_verified_at ?? null,
      address: {
        street: str(body.address?.street) ?? existing?.address?.street ?? '',
        city,
        postal_code: str(body.address?.postal_code) ?? existing?.address?.postal_code ?? '',
        country: 'France',
      },
      psp_account_id: existing?.psp_account_id ?? null,
      psp_onboarded: existing?.psp_onboarded ?? false,
      verified: withHonestVerification(base, Boolean(decoded.email_verified)),
      rating_avg: existing?.rating_avg ?? 0,
      rating_count: existing?.rating_count ?? 0,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    await docRef.set(stripUndefined(profile), { merge: true });
    return NextResponse.json({ ok: true, profile }, { status: 200 });
  } catch (e) {
    return errorResponse(e);
  }
}
