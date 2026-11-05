/**
 * POST /api/market/connect/onboarding
 * GET  /api/market/connect/onboarding (statut)
 *
 * Onboarding Stripe Connect Express du vendeur.
 * Le compte Connect est stocké sur market_seller_profiles/{uid} :
 *   psp_account_id, psp_onboarded (champs préexistants du schéma).
 *
 * POST → { ok, url } : crée le compte Express si absent, puis renvoie
 *        l'URL d'onboarding hébergée Stripe (KYC + RIB).
 * GET  → { ok, onboarded, account_id } : lit l'état réel chez Stripe
 *        et synchronise psp_onboarded en base.
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import {
  createConnectAccount,
  createOnboardingLink,
  getAccountStatus,
  isPspEnabled,
} from '@/lib/market/psp';

export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    if (!isPspEnabled()) {
      return NextResponse.json({ ok: false, error: 'PSP non configuré (STRIPE_SECRET_KEY absente)' }, { status: 503 });
    }

    const profileRef = adminDb.collection('market_seller_profiles').doc(decoded.uid);
    const snap = await profileRef.get();
    let accountId = snap.data()?.psp_account_id as string | undefined;

    // Compte déjà créé ? Sinon création du compte Express.
    if (!accountId) {
      accountId = await createConnectAccount(decoded.email || '');
      await profileRef.set(
        { psp_account_id: accountId, updated_at: new Date().toISOString() },
        { merge: true }
      );
    }

    const url = await createOnboardingLink(accountId);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function GET(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const snap = await adminDb.collection('market_seller_profiles').doc(decoded.uid).get();
    const accountId = snap.data()?.psp_account_id as string | undefined;

    if (!accountId || !isPspEnabled()) {
      return NextResponse.json({ ok: true, onboarded: false, account_id: null });
    }

    // Source de vérité = Stripe ; on synchronise la base au passage.
    const status = await getAccountStatus(accountId);
    const onboarded = status.payouts_enabled;
    await adminDb.collection('market_seller_profiles').doc(decoded.uid).set(
      { psp_onboarded: onboarded, updated_at: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ ok: true, onboarded, details_submitted: status.details_submitted, account_id: accountId });
  } catch (e) {
    return errorResponse(e);
  }
}
