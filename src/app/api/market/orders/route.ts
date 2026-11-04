import { NextResponse } from 'next/server';
import { errorResponse, requireAuth } from '@/lib/api-auth';
import { getOrderService } from '@/lib/market/server';
import { CreateOrderInput } from '@/lib/market/order-types';
import { ValidationError } from '@/lib/market/errors';

// POST /api/market/orders — Création d'une commande avec séquestre
export async function POST(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const body = await req.json();

    const listingId = typeof body.listing_id === 'string' ? body.listing_id.trim() : '';
    const quantity = parseInt(body.quantity, 10) || 1;
    const deliveryMode = body.delivery_mode === 'pickup' ? 'pickup' : 'shipping';

    if (!listingId) {
      throw new ValidationError('L’identifiant de l’annonce est requis', { listing_id: 'Requis' });
    }
    if (quantity < 1) {
      throw new ValidationError('La quantité doit être supérieure ou égale à 1', { quantity: 'Min 1' });
    }

    if (deliveryMode === 'shipping') {
      const addr = body.shipping_address || {};
      if (!addr.full_name || !addr.street || !addr.city || !addr.postal_code) {
        throw new ValidationError('Adresse de livraison incomplète', {
          shipping_address: 'Nom, adresse, code postal et ville requis',
        });
      }
    }

    const input: CreateOrderInput = {
      listing_id: listingId,
      quantity,
      delivery_mode: deliveryMode,
      shipping_address: deliveryMode === 'shipping' ? body.shipping_address : undefined,
    };

    const { order, payment } = await getOrderService().createOrder(decoded.uid, input);

    return NextResponse.json({ ok: true, order, payment }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}

// GET /api/market/orders — Lister ses commandes (acheteur ou vendeur via ?as=seller)
export async function GET(req: Request) {
  try {
    const decoded = await requireAuth(req);
    const url = new URL(req.url);
    const asSeller = url.searchParams.get('as') === 'seller';

    const orders = await getOrderService().listUserOrders(decoded.uid, asSeller ? 'seller' : 'buyer');
    return NextResponse.json({ ok: true, orders });
  } catch (e) {
    return errorResponse(e);
  }
}
