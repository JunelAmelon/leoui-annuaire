import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { uid, role, vendorType } = await req.json();
    if (!uid || !role) return NextResponse.json({ ok: false, error: 'uid and role required' }, { status: 400 });

    const claims: Record<string, string> = { role };
    if (vendorType) claims.vendorType = vendorType;

    await adminAuth.setCustomUserClaims(uid, claims);

    await adminDb.collection('users').doc(uid).set(
      { role, ...(vendorType ? { vendorType } : {}), updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
