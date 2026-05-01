import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { getPaypalAccessToken, getPaypalBaseUrl, PAYPAL_PLAN_IDS } from '@/lib/paypal';
import type { SubscriptionTier } from '@/lib/subscription-plans';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const { planId } = await req.json();
    const paypalPlanId = PAYPAL_PLAN_IDS[planId as Exclude<SubscriptionTier, 'free'>];
    if (!paypalPlanId) {
      return NextResponse.json({ ok: false, error: 'Plan PayPal non configuré' }, { status: 400 });
    }

    const vendorSnap = await adminDb.collection('vendors').doc(uid).get();
    const vendor = vendorSnap.data() as any;
    if (!vendor) return NextResponse.json({ ok: false, error: 'Prestataire introuvable' }, { status: 404 });

    const accessToken = await getPaypalAccessToken();
    const response = await fetch(`${getPaypalBaseUrl()}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        custom_id: uid,
        application_context: {
          brand_name: 'LeOui',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${APP_URL}/espace-prestataire/abonnement?success=true&provider=paypal`,
          cancel_url: `${APP_URL}/espace-prestataire/abonnement?canceled=true&provider=paypal`,
        },
        subscriber: {
          name: {
            given_name: vendor.name || decoded.name || 'Prestataire',
          },
          email_address: decoded.email || vendor.email || '',
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: data?.message || 'Impossible de créer l’abonnement PayPal' },
        { status: 500 }
      );
    }

    const approvalUrl = (data?.links || []).find((link: any) => link.rel === 'approve')?.href;
    if (!approvalUrl || !data?.id) {
      return NextResponse.json({ ok: false, error: 'Lien de validation PayPal introuvable' }, { status: 500 });
    }

    await adminDb.collection('vendors').doc(uid).set({
      pendingPaypalSubscriptionId: data.id,
      pendingPaypalPlanId: paypalPlanId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ ok: true, url: approvalUrl });
  } catch (e: any) {
    console.error('[paypal/checkout]', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
