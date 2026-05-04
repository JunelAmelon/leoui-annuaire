'use client';

import React, { useState, useCallback } from 'react';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import type { OnApproveData } from '@paypal/paypal-js';

// Custom types pour PayPal
type CreateSubscriptionData = {
  planId: string;
};

// Types
export interface PayPalButtonProps {
  /** Plan ID PayPal (votre plan_id créé dans le PayPal Dashboard) */
  planId: string;
  /** Callback quand l'abonnement est créé avec succès */
  onSubscriptionCreated?: (subscriptionId: string, data: OnApproveData) => void;
  /** Callback quand l'abonnement est approuvé */
  onSubscriptionApproved?: (data: OnApproveData, actions: any) => void;
  /** Callback en cas d'erreur */
  onError?: (error: Error) => void;
  /** Callback quand l'utilisateur annule */
  onCancel?: (data: Record<string, unknown>) => void;
  /** Style des boutons PayPal */
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?: 'rect' | 'pill' | 'sharp';
    label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment' | 'subscribe';
    height?: number;
    tagline?: boolean;
  };
  /** Désactiver le bouton */
  disabled?: boolean;
  /** Classe CSS additionnelle */
  className?: string;
  /** Montant personnalisé (pour les paiements uniques) */
  amount?: string;
  /** Mode capture pour les paiements uniques */
  intent?: 'capture' | 'subscription';
  /** Loading personnalisé */
  loadingComponent?: React.ReactNode;
}

// État local du bouton
interface ButtonState {
  isLoading: boolean;
  error: Error | null;
  subscriptionId: string | null;
}

/**
 * Composant interne qui gère le rendu des boutons PayPal
 */
function PayPalButtonContent({
  planId,
  onSubscriptionCreated,
  onSubscriptionApproved,
  onError,
  onCancel,
  style = {
    layout: 'vertical',
    color: 'gold',
    shape: 'rect',
    label: 'subscribe',
    height: 45,
    tagline: false,
  },
  disabled = false,
  intent = 'subscription',
}: PayPalButtonProps) {
  const [state, setState] = useState<ButtonState>({
    isLoading: false,
    error: null,
    subscriptionId: null,
  });

  // Get PayPal dispatch pour gérer le loading
  const [{ isPending }] = usePayPalScriptReducer();

  /**
   * Créer un abonnement
   */
  const createSubscription = useCallback(
    (data: Record<string, unknown>, actions: { subscription: { create: (options: { plan_id: string }) => Promise<string> } }) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        return actions.subscription.create({
          plan_id: planId,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Erreur création abonnement');
        setState(prev => ({ ...prev, isLoading: false, error: err }));
        onError?.(err);
        throw err;
      }
    },
    [planId, onError]
  );

  /**
   * Approuver l'abonnement
   */
  const onApprove = useCallback(
    async (data: OnApproveData, actions: any) => {
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        // Capture si nécessaire (pour les paiements uniques)
        if (intent === 'capture' && actions.order) {
          await actions.order.capture();
        }

        setState(prev => ({
          ...prev,
          isLoading: false,
          subscriptionId: data.subscriptionID || null,
        }));

        // Callbacks
        if (data.subscriptionID) {
          onSubscriptionCreated?.(data.subscriptionID, data);
        }
        onSubscriptionApproved?.(data, actions);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Erreur approbation');
        setState(prev => ({ ...prev, isLoading: false, error: err }));
        onError?.(err);
      }
    },
    [intent, onSubscriptionCreated, onSubscriptionApproved, onError]
  );

  /**
   * Gestion de l'annulation
   */
  const handleCancel = useCallback(
    (data: Record<string, unknown>) => {
      setState(prev => ({ ...prev, isLoading: false }));
      onCancel?.(data);
    },
    [onCancel]
  );

  /**
   * Gestion des erreurs PayPal
   */
  const handleError = useCallback(
    (error: Record<string, unknown>) => {
      const err = new Error(String(error.message || 'Erreur PayPal'));
      setState(prev => ({ ...prev, isLoading: false, error: err }));
      onError?.(err);
    },
    [onError]
  );

  if (isPending || state.isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-sm text-charcoal-600">Chargement de PayPal...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-lg bg-red-50 p-3 border border-red-200">
        <p className="text-sm text-red-600">
          Erreur: {state.error.message}
        </p>
        <button
          onClick={() => setState(prev => ({ ...prev, error: null }))}
          className="mt-2 text-xs text-red-600 underline hover:text-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className={`paypal-button-container ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <PayPalButtons
        style={style}
        createSubscription={intent === 'subscription' ? createSubscription : undefined}
        onApprove={onApprove}
        onCancel={handleCancel}
        onError={handleError}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * PayPalButton - Composant bouton d'abonnement PayPal
 * 
 * Utilise le SDK PayPal JavaScript pour créer des abonnements.
 * 
 * @example
 * ```tsx
 * <PayPalButton
 *   planId="P-XXXXXXXXXXXXXXXX"
 *   onSubscriptionCreated={(id) => console.log('Subscription:', id)}
 *   onError={(err) => console.error('Error:', err)}
 * />
 * ```
 */
export function PayPalButton(props: PayPalButtonProps) {
  const { className, loadingComponent } = props;

  // Configuration PayPal SDK
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
  
  const initialOptions = {
    clientId: clientId,
    vault: true,
    intent: (props.intent || 'subscription') as 'subscription' | 'capture',
    components: 'buttons',
    enableFunding: 'card',
    disableFunding: 'credit,bancontact,blik,eps,giropay,ideal,mercadopago,mybank,p24,sepa,sofort,venmo',
  };

  // Vérifier si PayPal est configuré
  if (!clientId) {
    return (
      <div className={`rounded-lg bg-amber-50 p-4 border border-amber-200 ${className || ''}`}>
        <p className="text-sm text-amber-700">
          PayPal n'est pas encore configuré. Veuillez contacter le support.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtonContent {...props} />
      </PayPalScriptProvider>
    </div>
  );
}

export default PayPalButton;
