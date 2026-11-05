/**
 * GET /api/admin/market/disputes
 *
 * Liste tous les litiges LeOui Market pour l'interface d'arbitrage admin.
 *
 * Architecture (SOLID / DIP) :
 *  - Cette route est une couche "transport" mince (SRP) :
 *    elle authentifie, vérifie le rôle, délègue au service, mappe les erreurs.
 *  - Aucune logique métier ici — tout est dans dispute-service.ts (DIP).
 *  - Le service est instancié via getDisputeService() (composition root
 *    server.ts), qui injecte adminDb sans que la route en sache quoi que ce soit.
 *
 * Sécurité :
 *  - requireAuth(req) : vérifie le token Firebase ID via Firebase Admin SDK.
 *  - Vérification du claim `role === 'admin'` → ForbiddenError (403) sinon.
 *
 * Paramètres de requête optionnels :
 *  - ?status=under_review  → filtre par statut côté Firestore (perf)
 *    Si absent, tous les litiges sont retournés (filtre client-side dans la page).
 *
 * Réponse succès : { ok: true, disputes: MarketDispute[] }
 * Réponse erreur : { ok: false, error: string, code?: string } via errorResponse()
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getDisputeService } from '@/lib/market/server';
import { ForbiddenError } from '@/lib/market/errors';

export async function GET(req: NextRequest) {
  try {
    // 1. Vérifier l'authentification Firebase (token Bearer)
    const decoded = await requireAuth(req);

    // 2. Vérifier le claim admin — ForbiddenError (403) si rôle incorrect
    if (decoded.role !== 'admin') {
      throw new ForbiddenError('Accès réservé à l\'équipe LeOui');
    }

    // 3. Paramètre de filtre optionnel (délégué au service qui query Firestore)
    const status = new URL(req.url).searchParams.get('status') || undefined;

    // 4. Délégation au service (DIP : la route ne sait pas comment les données
    //    sont stockées — c'est la responsabilité du store/service)
    const disputes = await getDisputeService().listAll(status);

    return NextResponse.json({ ok: true, disputes });
  } catch (e) {
    // errorResponse mappe MarketError → code HTTP approprié
    return errorResponse(e);
  }
}
