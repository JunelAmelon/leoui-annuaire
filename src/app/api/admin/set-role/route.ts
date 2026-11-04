/**
 * POST /api/admin/set-role
 *
 * Attribue un rôle Firebase Custom Claim à un utilisateur existant.
 * Accepte soit `uid` soit `email` pour identifier l'utilisateur cible.
 *
 * Body :
 *  { uid?: string, email?: string, role: string, vendorType?: string }
 *
 * Sécurité : token admin requis (role === 'admin' dans le claim).
 * Réponse : { ok: true } ou { ok: false, error: string }
 */

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    // 1. Vérifier le token Bearer
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    // 2. Vérifier le rôle admin dans les claims
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // 3. Parser le body — uid OU email requis
    const { uid: rawUid, email, role, vendorType } = await req.json() as {
      uid?: string;
      email?: string;
      role?: string;
      vendorType?: string;
    };

    if (!role) {
      return NextResponse.json({ ok: false, error: '`role` est requis' }, { status: 400 });
    }

    // 4. Résoudre l'UID — soit directement, soit via lookup par email
    let uid = rawUid;
    if (!uid) {
      if (!email) {
        return NextResponse.json({ ok: false, error: '`uid` ou `email` requis' }, { status: 400 });
      }
      try {
        // Recherche de l'utilisateur Firebase par email
        const userRecord = await adminAuth.getUserByEmail(email);
        uid = userRecord.uid;
      } catch {
        return NextResponse.json(
          { ok: false, error: `Aucun compte Firebase avec l'adresse ${email}` },
          { status: 404 }
        );
      }
    }

    // 5. Poser le claim Firebase Custom
    const claims: Record<string, string> = { role };
    if (vendorType) claims.vendorType = vendorType;
    await adminAuth.setCustomUserClaims(uid, claims);

    // 6. Mettre à jour le document Firestore (lecture client-side du rôle)
    await adminDb.collection('users').doc(uid).set(
      { role, ...(vendorType ? { vendorType } : {}), updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
