/**
 * GET /api/admin/market/stats
 *
 * Statistiques agrégées LeOui Market pour le dashboard admin.
 *
 * Architecture SOLID / DIP :
 *  - SRP : lecture pure (pas d'effet de bord), agrégation côté serveur.
 *  - Admin SDK → accès total à toutes les collections market_* (règles Firestore
 *    bloquent l'accès client-side à ces collections, cf. firestore.rules).
 *
 * Retourne :
 *  {
 *    ok: true,
 *    stats: {
 *      listings_active:   number  // annonces publiées et disponibles
 *      orders_total:      number  // toutes les commandes
 *      orders_pending:    number  // commandes en cours (paid, preparing, shipped)
 *      disputes_open:     number  // litiges actifs (open + awaiting_seller + under_review)
 *      disputes_total:    number  // tous les litiges
 *      sellers_active:    number  // vendeurs avec au moins une annonce
 *    }
 *  }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/lib/api-auth';
import { adminDb } from '@/lib/firebase-admin';
import { ForbiddenError } from '@/lib/market/errors';

// Statuts de commandes considérés comme "en cours" (ni terminés ni remboursés)
const PENDING_ORDER_STATUSES = ['paid', 'preparing', 'shipped', 'pickup_scheduled', 'disputed'];

// Statuts de litiges considérés comme "actifs" (pas encore tranchés)
const ACTIVE_DISPUTE_STATUSES = ['open', 'awaiting_seller', 'under_review'];

export async function GET(req: NextRequest) {
  try {
    // Authentification + rôle admin requis
    const decoded = await requireAuth(req);
    if (decoded.role !== 'admin') {
      throw new ForbiddenError('Accès réservé à l\'équipe LeOui');
    }

    // Requêtes parallèles pour réduire la latence
    const [
      listingsSnap,
      ordersSnap,
      disputesSnap,
      sellersSnap,
    ] = await Promise.all([
      // Annonces publiées et disponibles (status active)
      adminDb.collection('market_listings')
        .where('status', '==', 'active')
        .count()
        .get(),

      // Toutes les commandes (pour total + filtrage pending)
      adminDb.collection('market_orders').get(),

      // Tous les litiges (pour total + filtrage actifs)
      adminDb.collection('market_disputes').get(),

      // Vendeurs uniques (seller_id distincts dans les annonces publiées)
      adminDb.collection('market_listings')
        .where('status', '==', 'active')
        .select('seller_id')
        .get(),
    ]);

    // Agrégation des commandes en cours
    const orders = ordersSnap.docs;
    const orders_pending = orders.filter(d =>
      PENDING_ORDER_STATUSES.includes((d.data() as any).order_status || '')
    ).length;

    // Agrégation des litiges actifs
    const disputes = disputesSnap.docs;
    const disputes_open = disputes.filter(d =>
      ACTIVE_DISPUTE_STATUSES.includes((d.data() as any).status || '')
    ).length;

    // Comptage des vendeurs distincts (Set de seller_id uniques)
    const sellerIds = new Set<string>();
    sellersSnap.docs.forEach(d => {
      const sid = (d.data() as any).seller_id;
      if (sid) sellerIds.add(sid);
    });

    return NextResponse.json({
      ok: true,
      stats: {
        listings_active:  listingsSnap.data().count,
        orders_total:     orders.length,
        orders_pending,
        disputes_open,
        disputes_total:   disputes.length,
        sellers_active:   sellerIds.size,
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
