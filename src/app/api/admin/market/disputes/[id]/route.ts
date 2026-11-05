/**
 * GET  /api/admin/market/disputes/[id]
 * PATCH /api/admin/market/disputes/[id]
 *
 * Détail et arbitrage d'un litige précis par l'équipe LeOui Market.
 *
 * Architecture (SOLID / DIP) :
 *  - SRP : route = transport uniquement (auth → délégation service → mapping erreur).
 *  - DIP : dépend de DisputeService via getDisputeService() (composition root).
 *    La route n'importe pas Firestore directement.
 *  - OCP : pour ajouter une action (ex: 'add_note'), on étend le PATCH sans
 *    modifier la logique existante — le service gère chaque action.
 *
 * Sécurité :
 *  - requireAdmin() factorisé ici : requiert token Firebase + claim role=admin.
 *  - Les deux verbes HTTP utilisent le même guard.
 *
 * PATCH body :
 *  {
 *    action: 'resolve',            // seule action supportée pour l'instant
 *    decision: 'buyer' | 'seller', // en faveur de qui
 *    note: string                  // note de résolution (min. 10 chars, validée par le service)
 *  }
 *
 *  'buyer'  → dispute.status = 'resolved_buyer',  order = 'refunded', payment = 'refunded'
 *  'seller' → dispute.status = 'resolved_seller', payout créé,        order = 'completed'
 *
 *  La transaction Firestore dans le service garantit l'atomicité.
 *
 * Réponse succès : { ok: true, dispute: MarketDispute }
 * Réponse erreur : { ok: false, error: string, code?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getDisputeService } from '@/lib/market/server';
import { ForbiddenError, ValidationError } from '@/lib/market/errors';

/**
 * Guard réutilisable pour les deux verbes :
 * vérifie le token Firebase et le claim admin.
 * Lève ForbiddenError si le rôle est insuffisant.
 */
async function requireAdmin(req: NextRequest) {
  const decoded = await requireAuth(req);
  if (decoded.role !== 'admin') {
    throw new ForbiddenError('Accès réservé à l\'équipe LeOui');
  }
  return decoded;
}

// ── GET : récupérer le détail complet d'un litige ─────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);

    // Lecture complète sans filtrage participant (admin = accès total)
    const dispute = await getDisputeService().getForAdmin(params.id);

    return NextResponse.json({ ok: true, dispute });
  } catch (e) {
    return errorResponse(e);
  }
}

// ── PATCH : arbitrer (trancher) un litige ─────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentification + rôle admin
    const decoded = await requireAdmin(req);

    // Parsing du corps — seule l'action 'resolve' est reconnue pour l'instant
    const body = await req.json() as { action?: string; decision?: string; note?: string };

    if (body.action !== 'resolve') {
      throw new ValidationError('Action non reconnue — seule "resolve" est supportée');
    }

    // Délégation à dispute-service.resolve() :
    //  - valide la décision et la note
    //  - exécute la transaction atomique (dispute + order + payment + payout)
    //  - enregistre decoded.uid dans decided_by et ajoute un message admin
    const dispute = await getDisputeService().resolve(decoded.uid, params.id, {
      decision: body.decision as 'buyer' | 'seller',
      note: body.note,
    });

    return NextResponse.json({ ok: true, dispute });
  } catch (e) {
    return errorResponse(e);
  }
}
