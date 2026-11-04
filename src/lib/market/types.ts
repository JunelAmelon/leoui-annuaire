// Types métier LeOui Market — alignés sur docs/FIRESTORE_SCHEMA.md
// Statuts commande / paiement / reversement volontairement séparés (CDC §14).

export type ListingCondition = 'neuf' | 'comme_neuf' | 'bon_etat' | 'usage';

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'reserved'
  | 'sold'
  | 'exhausted'
  | 'suspended'
  | 'removed';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'pickup_scheduled'
  | 'delivered'
  | 'receipt_confirmed'
  | 'completed'
  | 'cancelled'
  | 'payment_failed'
  | 'disputed'
  | 'refunding'
  | 'refunded';

export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'confirmed'
  | 'payout_pending'
  | 'payout_requested'
  | 'paid_out'
  | 'refunding'
  | 'refunded'
  | 'failed';

export type PayoutStatus = 'pending' | 'requested' | 'executed' | 'failed';

export type DeliveryMode = 'shipping' | 'pickup';

export type DisputeReason =
  | 'not_received'
  | 'damaged'
  | 'not_as_described'
  | 'wrong_quantity'
  | 'wrong_item'
  | 'pickup_issue'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'awaiting_seller'
  | 'under_review'
  | 'resolved_buyer'
  | 'resolved_seller'
  | 'closed';

export type SellerStatus = 'particulier' | 'professionnel';

export interface GeoPoint {
  city: string;
  postal_code?: string;
  approx_lat?: number;
  approx_lng?: number;
}

export interface MarketSellerProfile {
  uid: string;
  display_name: string;
  status: SellerStatus;
  photo_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  /** Renseigné uniquement après une vraie vérification SMS (non implémentée). */
  phone_verified_at?: string | null;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;
  psp_account_id?: string | null;
  psp_onboarded: boolean;
  verified: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    payout: boolean;
  };
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface MarketListing {
  id: string;
  seller_id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  subcategory?: string | null;
  price: number;
  quantity: number;
  quantity_reserved: number;
  condition: ListingCondition;
  images: string[];
  attributes?: {
    dimensions?: string;
    material?: string;
    color?: string;
    defects?: string;
  };
  location: GeoPoint;
  delivery: {
    shipping: boolean;
    shipping_cost?: number;
    pickup: boolean;
  };
  status: ListingStatus;
  views_count: number;
  favorites_count: number;
  moderation_note?: string | null;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  quantity: number;
  condition: ListingCondition;
  images: string[];
  attributes?: MarketListing['attributes'];
  location: GeoPoint;
  delivery: MarketListing['delivery'];
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  status?: 'draft' | 'active' | 'paused';
}

export interface PublicListingFilters {
  category?: string;
  subcategory?: string;
  condition?: ListingCondition;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  q?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'relevance';
  limit?: number;
  offset?: number;
}

export interface MarketOrder {
  id: string;
  listing_id: string;
  listing_snapshot: { title: string; image: string; price: number };
  buyer_id: string;
  seller_id: string;
  quantity: number;
  delivery_mode: DeliveryMode;
  shipping_address?: Record<string, string> | null;
  pickup_code?: string | null;
  amounts: {
    items: number;
    shipping: number;
    service_fee: number;
    total: number;
  };
  order_status: OrderStatus;
  tracking?: {
    carrier?: string;
    number?: string;
    shipped_at?: string;
    delivered_at?: string;
  };
  receipt_confirmed_at?: string;
  /** Statut avant ouverture d'un litige, pour le restaurer si l'acheteur le retire. */
  status_before_dispute?: OrderStatus;
  history: { status: string; at: string; by: string }[];
  created_at: string;
  updated_at: string;
}

export interface MarketPayment {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: 'eur';
  commission_rate: number;
  commission_amount: number;
  seller_net: number;
  psp: 'stripe_connect' | 'mangopay';
  psp_ref?: string | null;
  idempotency_key: string;
  payment_status: PaymentStatus;
  events: { type: string; at: string; payload_hash?: string }[];
  created_at: string;
  updated_at: string;
}

export interface MarketPayout {
  id: string;
  payment_id: string;
  order_id: string;
  seller_id: string;
  amount: number;
  currency: 'eur';
  payout_status: PayoutStatus;
  psp_payout_ref?: string | null;
  requested_at?: string;
  executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DisputeMessage {
  by: string;
  role: 'buyer' | 'seller' | 'admin';
  body: string;
  at: string;
}

export interface MarketDispute {
  id: string;
  order_id: string;
  /** Copies figées pour l'affichage sans relire la commande. */
  listing_title?: string;
  listing_image?: string;
  buyer_id: string;
  seller_id: string;
  opened_by: string;
  reason: DisputeReason;
  description: string;
  evidence: string[];
  status: DisputeStatus;
  messages: DisputeMessage[];
  seller_response?: string | null;
  resolution_note?: string | null;
  decided_by?: string | null;
  decided_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketReview {
  id: string;
  order_id: string;
  reviewer_id: string;
  seller_id: string;
  listing_id: string;
  rating: number;
  comment?: string;
  seller_reply?: string | null;
  status: 'visible' | 'flagged' | 'removed';
  created_at: string;
}
