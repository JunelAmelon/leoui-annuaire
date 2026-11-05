/**
 * PATCH /api/admin/vendors/[id]
 *
 * Mise à jour partielle d'un prestataire (statut, etc.).
 * Remplace l'ancien workaround qui passait par /api/admin/vendors-seed
 * pour toggler le statut d'un seul vendeur.
 *
 * Architecture SOLID / DIP :
 *  - SRP : route mince → auth + validation transport + délégation Firestore.
 *  - La route n'a pas de logique métier : elle met à jour uniquement les champs
 *    fournis dans le body (patch partiel via Firestore `.update()`).
 *  - L'Admin SDK ignore les règles Firestore (ok côté sécurité : la route
 *    vérifie elle-même le rôle admin via requireAuth).
 *
 * Body accepté (tous les champs sont optionnels) :
 *  { status?: 'active' | 'inactive' }
 *
 * Réponse succès : { ok: true }
 * Réponse erreur : { ok: false, error: string, code?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/lib/api-auth';
import { adminDb } from '@/lib/firebase-admin';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/market/errors';

// Champs autorisés pour la mise à jour via cet endpoint admin
const ALLOWED_STATUS = ['active', 'inactive'] as const;
type VendorStatus = (typeof ALLOWED_STATUS)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth + rôle admin obligatoire
    const decoded = await requireAuth(req);
    if (decoded.role !== 'admin') {
      throw new ForbiddenError('Accès réservé à l\'équipe LeOui');
    }

    // 2. Vérifier que le vendeur existe
    const vendorRef = adminDb.collection('vendors').doc(params.id);
    const snap = await vendorRef.get();
    if (!snap.exists) {
      throw new NotFoundError('Prestataire introuvable');
    }

    // 3. Parser le body — seul `status` est accepté pour l'instant
    const body = await req.json() as { status?: string };

    if (body.status !== undefined && !ALLOWED_STATUS.includes(body.status as VendorStatus)) {
      throw new ValidationError(`Statut invalide. Valeurs acceptées : ${ALLOWED_STATUS.join(', ')}`);
    }

    // 4. Construire le patch (uniquement les champs fournis)
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.status !== undefined) patch.status = body.status;

    // 5. Mise à jour atomique dans Firestore (Admin SDK ignore les règles)
    await vendorRef.update(patch);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
