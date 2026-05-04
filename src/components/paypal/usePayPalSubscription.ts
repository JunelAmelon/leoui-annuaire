'use client';

import { useState, useCallback } from 'react';
import type { 
  UsePayPalSubscriptionProps, 
  UsePayPalSubscriptionResult,
  PayPalCheckoutResponse,
  PayPalManageResponse 
} from './types';

/**
 * Hook pour gérer les abonnements PayPal
 * 
 * Fournit des fonctions pour:
 * - Initier le checkout PayPal (redirection vers PayPal)
 * - Gérer l'abonnement existant (portail client)
 * 
 * @example
 * ```tsx
 * const { initiateCheckout, manageSubscription, isLoading, error } = usePayPalSubscription({
 *   onSuccess: (id) => console.log('Subscription:', id),
 *   onError: (err) => console.error('Error:', err),
 * });
 * 
 * // Initier le checkout
 * await initiateCheckout('starter');
 * ```
 */
export function usePayPalSubscription(
  props: UsePayPalSubscriptionProps = {}
): UsePayPalSubscriptionResult {
  const { onSuccess, onError, onCancel } = props;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Initier le processus de checkout PayPal
   * Redirection vers l'URL d'approbation PayPal
   */
  const initiateCheckout = useCallback(async (planId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Vous devez être connecté pour souscrire');
      }

      // Call checkout API
      const response = await fetch('/api/paypal/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const data: PayPalCheckoutResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Erreur lors de la création de l\'abonnement');
      }

      if (!data.url) {
        throw new Error('URL de redirection PayPal introuvable');
      }

      // Redirect to PayPal
      window.location.href = data.url;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  /**
   * Ouvrir le portail de gestion PayPal
   * Pour modifier ou annuler l'abonnement
   */
  const manageSubscription = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get auth token
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Vous devez être connecté');
      }

      // Call manage API
      const response = await fetch('/api/paypal/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data: PayPalManageResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Erreur lors de l\'ouverture du portail');
      }

      if (!data.url) {
        throw new Error('URL de gestion introuvable');
      }

      // Open in new tab
      window.open(data.url, '_blank');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  return {
    initiateCheckout,
    manageSubscription,
    isLoading,
    error,
  };
}

/**
 * Helper pour récupérer le token Firebase Auth
 */
async function getAuthToken(): Promise<string | null> {
  // Check if Firebase Auth is available
  if (typeof window === 'undefined') return null;
  
  // Dynamic import to avoid SSR issues
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) return null;
    
    return await user.getIdToken();
  } catch {
    return null;
  }
}

export default usePayPalSubscription;
