import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { getPaypalCustomerManageUrl } from '@/lib/paypal';

export async function POST(req: Request) {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 });
    }

    // Vérifier le token Firebase
    await adminAuth.verifyIdToken(token);

    // Retourner l'URL de gestion PayPal
    return NextResponse.json({ ok: true, url: getPaypalCustomerManageUrl() });
  } catch (e: any) {
    console.error('[paypal/manage]', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
