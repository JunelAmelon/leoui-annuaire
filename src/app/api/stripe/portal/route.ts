import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const vendorSnap = await adminDb.collection('vendors').doc(uid).get();
    const vendor = vendorSnap.data() as any;
    const stripeCustomerId: string = vendor?.stripeCustomerId || '';

    if (!stripeCustomerId) {
      return NextResponse.json({ ok: false, error: 'Aucun abonnement actif trouvé' }, { status: 400 });
    }

    try {
      await stripe.customers.retrieve(stripeCustomerId);
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Client Stripe introuvable. Relancez un abonnement pour régénérer votre profil de paiement.' },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${APP_URL}/espace-prestataire/abonnement`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error('[stripe/portal]', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
