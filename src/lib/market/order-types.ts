// Types et interfaces de l'Escrow & Commandes LeOui Market — CDC §4, §5, §14

import type { OrderStatus, PaymentStatus, PayoutStatus, DeliveryMode } from './types';

export interface CreateOrderInput {
  listing_id: string;
  quantity: number;
  delivery_mode: DeliveryMode;
  /** Réf. PaymentIntent Stripe réelle (webhook checkout). Absent = mode démo. */
  psp_ref?: string;
  shipping_address?: {
    full_name: string;
    street: string;
    city: string;
    postal_code: string;
    country: string;
    phone?: string;
  };
}

export interface ConfirmReceiptInput {
  order_id: string;
}

export interface ShipOrderInput {
  order_id: string;
  carrier: string;
  tracking_number: string;
}

export interface HandshakeConfirmInput {
  order_id: string;
  pickup_code: string;
}
