/**
 * POST /api/admin/bootstrap
 *
 * Endpoint de démarrage pour créer le PREMIER compte admin.
 * Ne nécessite PAS d'être déjà admin — utilise un secret partagé.
 *
 * Usage (curl) :
 *   curl -X POST http://localhost:3000/api/admin/bootstrap \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"admin@exemple.fr","secret":"VOTRE_BOOTSTRAP_SECRET"}'
 *
 * Sécurité :
 *  - Protégé par la variable d'env ADMIN_BOOTSTRAP_SECRET (>= 16 chars recommandés).
 *  - Désactiver après le premier setup en supprimant la variable ou en ajoutant
 *    une logique "déjà bootstrappé".
 *  - Ne retourne jamais le secret dans la réponse.
 *
 * Ce que fait cet endpoint :
 *  1. Vérifie le secret
 *  2. Recherche l'utilisateur Firebase par email
 *  3. Pose le claim Firebase `role = 'admin'`
 *  4. Met à jour (ou crée) le document users/{uid} dans Firestore
 *
 * Réponse succès : { ok: true, uid: string, email: string }
 * Réponse erreur : { ok: false, error: string }
 */

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    // 1. Lire le body
    const { email, secret } = await req.json() as { email?: string; secret?: string };

    // 2. Vérifier le secret de bootstrap
    const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!bootstrapSecret) {
      return NextResponse.json(
        { ok: false, error: 'Bootstrap désactivé (ADMIN_BOOTSTRAP_SECRET non défini)' },
        { status: 403 }
      );
    }
    if (!secret || secret !== bootstrapSecret) {
      return NextResponse.json(
        { ok: false, error: 'Secret incorrect' },
        { status: 403 }
      );
    }

    // 3. Vérifier que l'email est fourni
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Email invalide' },
        { status: 400 }
      );
    }

    // 4. Trouver l'utilisateur Firebase Auth par email
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json(
        { ok: false, error: `Aucun compte Firebase avec l'adresse ${email}. Créez d'abord le compte sur /login.` },
        { status: 404 }
      );
    }

    const uid = userRecord.uid;

    // 5. Poser le claim admin sur le token Firebase
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

    // 6. Mettre à jour le document Firestore (pour la lecture client-side)
    await adminDb.collection('users').doc(uid).set(
      { uid, email, role: 'admin', updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ ok: true, uid, email, message: `Rôle admin accordé à ${email}. Déconnectez-vous et reconnectez-vous pour que le claim soit actif.` });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
