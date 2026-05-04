/**
 * Composants et hooks PayPal pour LeOui
 * 
 * Ce module fournit tous les outils nécessaires pour intégrer
 * les paiements et abonnements PayPal dans l'application.
 * 
 * @example
 * ```tsx
 * import { 
 *   PayPalButton, 
 *   PayPalSubscriptionCard,
 *   PayPalRedirectHandler,
 *   usePayPalSubscription 
 * } from '@/components/paypal';
 * ```
 */

// Composants
export { PayPalButton } from './PayPalButton';
export { PayPalSubscriptionCard } from './PayPalSubscriptionCard';
export { PayPalRedirectHandler } from './PayPalRedirectHandler';

// Hooks
export { usePayPalSubscription } from './usePayPalSubscription';

// Types
export type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionInfo,
  PayPalCheckoutResponse,
  PayPalManageResponse,
  PayPalWebhookEvent,
  PayPalWebhookPayload,
  PayPalButtonStyle,
  PayPalConfig,
  PayPalComponentState,
  UsePayPalSubscriptionProps,
  UsePayPalSubscriptionResult,
  PricingCard,
} from './types';

// Types pour les props des composants
export type { PayPalButtonProps } from './PayPalButton';
