/**
 * POST /api/admin/create-user
 *
 * Crée un compte Firebase Auth + document Firestore avec un rôle donné.
 * Réservé aux admins — le caller doit avoir le claim role === 'admin'.
 *
 * Body :
 *  { email: string, password: string, displayName: string,
 *    role: 'admin'|'vendor'|'planner'|'client', vendorType?: string }
 *
 * Réponse : { ok: true, uid: string } | { ok: false, error: string }
 */

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { requireAuth, errorResponse } from '@/lib/api-auth';
import { ForbiddenError, ValidationError } from '@/lib/market/errors';

const ALLOWED_ROLES = ['admin', 'vendor', 'planner', 'client'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function POST(req: Request) {
  try {
    // 1. Authentification + rôle admin obligatoire
    const decoded = await requireAuth(req as any);
    if (decoded.role !== 'admin') throw new ForbiddenError('Accès réservé aux admins');

    // 2. Parser et valider le body
    const { email, password, displayName, role, vendorType } = await req.json() as {
      email?: string; password?: string; displayName?: string;
      role?: string; vendorType?: string;
    };

    if (!email?.includes('@'))  throw new ValidationError('Email invalide');
    if (!password || password.length < 8) throw new ValidationError('Mot de passe trop court (8 caractères minimum)');
    if (!displayName?.trim())   throw new ValidationError('Nom requis');
    if (!role || !ALLOWED_ROLES.includes(role as AllowedRole)) {
      throw new ValidationError(`Rôle invalide. Valeurs : ${ALLOWED_ROLES.join(', ')}`);
    }

    // 3. Créer le compte Firebase Auth
    const userRecord = await adminAuth.createUser({
      email:         email.trim(),
      password,
      displayName:   displayName.trim(),
      emailVerified: false,
    });
    const uid = userRecord.uid;

    // 4. Poser les custom claims
    const claims: Record<string, string> = { role };
    if (role === 'vendor' && vendorType) claims.vendorType = vendorType;
    await adminAuth.setCustomUserClaims(uid, claims);

    // 5. Créer le document Firestore
    const now = new Date().toISOString();
    await adminDb.collection('users').doc(uid).set({
      uid, email: email.trim(), displayName: displayName.trim(),
      role, ...(vendorType ? { vendorType } : {}),
      createdAt: now, updatedAt: now,
    });

    return NextResponse.json({ ok: true, uid });
  } catch (e) {
    return errorResponse(e);
  }
}
