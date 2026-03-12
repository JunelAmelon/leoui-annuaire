import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { email, password, name, businessName, category, city, phone } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ ok: false, error: 'email, password, name requis' }, { status: 400 });
    }

    let uid: string;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      uid = existing.uid;
      await adminAuth.updateUser(uid, { displayName: name });
    } catch {
      const newUser = await adminAuth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      });
      uid = newUser.uid;
    }

    await adminAuth.setCustomUserClaims(uid, { role: 'vendor' });

    const now = new Date().toISOString();

    await adminDb.collection('profiles').doc(uid).set(
      { uid, email, name, role: 'vendor', phone: phone || null, created_at: now },
      { merge: true }
    );

    await adminDb.collection('users').doc(uid).set(
      { uid, email, role: 'vendor', created_at: now },
      { merge: true }
    );

    const vendorRef = adminDb.collection('vendors').doc(uid);
    const existing = await vendorRef.get();
    if (!existing.exists) {
      await vendorRef.set({
        id: uid,
        uid,
        name: businessName || name,
        category: category || '',
        location: city || '',
        status: 'active',
        rating: 0,
        weddingsCompleted: 0,
        images: [],
        tags: [],
        faqs: [],
        team: [],
        packages: [],
        reportages: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    const customToken = await adminAuth.createCustomToken(uid, { role: 'vendor' });

    return NextResponse.json({ ok: true, uid, customToken });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
