/**
 * Types pour l'intégration PayPal
 */

// Types de plans d'abonnement
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'elite';

// Statut d'un abonnement
export type SubscriptionStatus = 
  | 'active' 
  | 'cancelled' 
  | 'suspended' 
  | 'expired' 
  | 'past_due' 
  | 'pending' 
  | 'free';

// Informations d'abonnement
export interface SubscriptionInfo {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: 'paypal' | 'stripe' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paypalSubscriptionId?: string;
  stripeSubscriptionId?: string;
}

// Réponse de l'API checkout
export interface PayPalCheckoutResponse {
  ok: boolean;
  url?: string;
  error?: string;
}

// Réponse de l'API manage
export interface PayPalManageResponse {
  ok: boolean;
  url?: string;
  error?: string;
}

// Événements webhook PayPal
export type PayPalWebhookEvent =
  | 'BILLING.SUBSCRIPTION.CREATED'
  | 'BILLING.SUBSCRIPTION.ACTIVATED'
  | 'BILLING.SUBSCRIPTION.UPDATED'
  | 'BILLING.SUBSCRIPTION.EXPIRED'
  | 'BILLING.SUBSCRIPTION.CANCELLED'
  | 'BILLING.SUBSCRIPTION.SUSPENDED'
  | 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'
  | 'BILLING.SUBSCRIPTION.RE-ACTIVATED'
  | 'PAYMENT.SALE.COMPLETED'
  | 'PAYMENT.SALE.DENIED'
  | 'PAYMENT.SALE.REFUNDED';

// Données de l'événement webhook
export interface PayPalWebhookPayload {
  id: string;
  event_type: PayPalWebhookEvent;
  resource: {
    id: string;
    plan_id: string;
    custom_id?: string;
    status?: string;
    billing_info?: {
      next_billing_time?: string;
      last_payment?: {
        time: string;
        amount: {
          currency_code: string;
          value: string;
        };
      };
      outstanding_balance?: {
        currency_code: string;
        value: string;
      };
    };
    subscriber?: {
      email_address?: string;
      name?: {
        given_name?: string;
        surname?: string;
      };
    };
  };
  create_time: string;
  resource_type: string;
  summary?: string;
}

// Options de style PayPal
export interface PayPalButtonStyle {
  layout?: 'vertical' | 'horizontal';
  color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
  shape?: 'rect' | 'pill' | 'sharp';
  label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment' | 'subscribe';
  height?: number;
  tagline?: boolean;
}

// Configuration PayPal
export interface PayPalConfig {
  clientId: string;
  environment: 'sandbox' | 'live';
  planIds: Record<Exclude<SubscriptionTier, 'free'>, string>;
}

// État du composant PayPal
export interface PayPalComponentState {
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  subscriptionId: string | null;
}

// Props pour le hook usePayPalSubscription
export interface UsePayPalSubscriptionProps {
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

// Résultat du hook usePayPalSubscription
export interface UsePayPalSubscriptionResult {
  initiateCheckout: (planId: string) => Promise<void>;
  manageSubscription: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// Carte de prix/abonnement
export interface PricingCard {
  id: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
  paypalPlanId?: string;
  stripePriceId?: string;
}
