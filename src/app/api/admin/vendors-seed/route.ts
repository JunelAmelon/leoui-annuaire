import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const DEFAULT_PASSWORD = 'LeOui2024!';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { vendors = [], deleteAll = false } = body;

    if (vendors.length === 0) return NextResponse.json({ error: 'No vendors provided' }, { status: 400 });

    // Step 1: delete all existing vendor docs
    if (deleteAll) {
      const refs = await adminDb.collection('vendors').listDocuments();
      await Promise.all(refs.map(r => r.delete()));
    }

    const results: { id: string; name: string; email: string; password: string; ok: boolean; error?: string }[] = [];

    for (const v of vendors) {
      const slug = String(v?.id || '').toLowerCase();
      const name = String(v?.name || slug);
      const email = `${slug}@leoui-test.fr`;

      try {
        // Remove any existing auth user with this email
        try {
          const existing = await adminAuth.getUserByEmail(email);
          await adminAuth.deleteUser(existing.uid);
        } catch { /* doesn't exist yet */ }

        // Create Firebase Auth account
        const userRecord = await adminAuth.createUser({ email, password: DEFAULT_PASSWORD, displayName: name });
        const uid = userRecord.uid;

        // Set vendor custom claim
        await adminAuth.setCustomUserClaims(uid, { role: 'vendor' });

        // Build vendor Firestore document (UID as doc ID)
        const { id: _staticId, ...rest } = v as any;
        const vendorDoc = { ...rest, id: uid, uid, email, name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        await adminDb.collection('vendors').doc(uid).set(vendorDoc);

        // Mirror in users collection
        await adminDb.collection('users').doc(uid).set({ uid, email, role: 'vendor', name, createdAt: new Date().toISOString() });

        results.push({ id: uid, name, email, password: DEFAULT_PASSWORD, ok: true });
      } catch (e: any) {
        results.push({ id: slug, name, email, password: DEFAULT_PASSWORD, ok: false, error: e?.message || String(e) });
      }
    }

    return NextResponse.json({ ok: true, results, total: results.length, okCount: results.filter(r => r.ok).length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
