import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { reconcileVendorStripeSubscription } from '@/lib/stripe-sync';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const result = await reconcileVendorStripeSubscription(uid);
    if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 });
    return NextResponse.json({ ok: true, tier: result.tier, status: result.status });
  } catch (e: any) {
    console.error('[stripe/reconcile]', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
