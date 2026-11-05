/**
 * POST /api/market/checkout
 *
 * Crée une Stripe Checkout Session pour une commande Market.
 * La commande Firestore n'est créée qu'APRÈS paiement confirmé, dans le
 * webhook checkout.session.completed (kind = 'market_order').
 *
 * Sécurité : le montant est recalculé ici depuis l'annonce en base —
 * jamais depuis le body client (anti-tampering).
 *
 * Body : { listing_id, quantity, delivery_mode, shipping_address? }
 * Réponse : { ok, url } → redirect navigateur vers la page hébergée Stripe.
 */

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { createCheckoutSession, isPspEnabled } from '@/lib/market/psp';
import { ValidationError, ConflictError, ForbiddenError } from '@/lib/market/errors';
import type { MarketListing } from '@/lib/market/types';

export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    if (!isPspEnabled()) {
      return NextResponse.json({ ok: false, error: 'Paiement non configuré' }, { status: 503 });
    }

    const body = await req.json();
    const listingId = typeof body.listing_id === 'string' ? body.listing_id.trim() : '';
    const quantity = Math.max(1, parseInt(body.quantity, 10) || 1);
    const deliveryMode = body.delivery_mode === 'pickup' ? 'pickup' : 'shipping';
    if (!listingId) throw new ValidationError('Annonce requise');

    // ── Rechargement de l'annonce côté serveur (prix = source de vérité) ──
    const listingSnap = await adminDb.collection('market_listings').doc(listingId).get();
    if (!listingSnap.exists) throw new ValidationError('Annonce introuvable');
    const listing = listingSnap.data() as MarketListing;

    if (listing.status !== 'active') throw new ConflictError('Annonce indisponible');
    if (listing.seller_id === decoded.uid) throw new ForbiddenError('Achat de sa propre annonce interdit');
    const available = listing.quantity - (listing.quantity_reserved || 0);
    if (quantity > available) throw new ConflictError('Stock insuffisant');
    if (deliveryMode === 'shipping' && !listing.delivery?.shipping) throw new ValidationError('Livraison non proposée');
    if (deliveryMode === 'pickup' && !listing.delivery?.pickup) throw new ValidationError('Remise en main propre non proposée');

    // Adresse obligatoire en mode shipping (même règle que /api/market/orders)
    const addr = body.shipping_address || {};
    if (deliveryMode === 'shipping' && (!addr.full_name || !addr.street || !addr.city || !addr.postal_code)) {
      throw new ValidationError('Adresse de livraison incomplète');
    }

    // ── Recalcul serveur des montants (mêmes formules qu'order-service) ──
    const itemsTotal = listing.price * quantity;
    const shippingCost = deliveryMode === 'shipping' ? (listing.delivery.shipping_cost || 0) : 0;
    const serviceFee = Math.round(itemsTotal * 0.05 * 100) / 100; // 5 % protection acheteur
    const grandTotal = Math.round((itemsTotal + shippingCost + serviceFee) * 100) / 100;

    const url = await createCheckoutSession({
      buyerUid: decoded.uid,
      buyerEmail: decoded.email ?? null,
      listingId,
      listingTitle: listing.title,
      amountEur: grandTotal,
      quantity,
      deliveryMode,
      shippingAddress: deliveryMode === 'shipping' ? addr : undefined,
    });

    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return errorResponse(e);
  }
}
