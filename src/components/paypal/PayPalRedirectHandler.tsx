'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface PayPalRedirectHandlerProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

/**
 * Gestionnaire de redirection PayPal
 * 
 * Ce composant gère les retours de PayPal après l'abonnement:
 * - success=true : abonnement confirmé
 * - canceled=true : utilisateur a annulé
 * 
 * À placer sur la page de retour (ex: /espace-prestataire/abonnement)
 * 
 * @example
 * ```tsx
 * export default function SubscriptionPage() {
 *   return (
 *     <div>
 *       <h1>Abonnement</h1>
 *       <PayPalRedirectHandler 
 *         onSuccess={() => toast.success('Abonnement actif !')}
 *         onCancel={() => toast.info('Vous avez annulé')}
 *       />
 *       {/* ... reste de la page ... *\/}
 *     </div>
 *   );
 * }
 * ```
 */
export function PayPalRedirectHandler({
  onSuccess,
  onCancel,
  onError,
}: PayPalRedirectHandlerProps) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'cancel' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const provider = searchParams.get('provider');

    // Ne traiter que les callbacks PayPal
    if (provider !== 'paypal') return;

    if (success === 'true') {
      setStatus('success');
      setMessage('Votre abonnement PayPal est maintenant actif !');
      onSuccess?.();
    } else if (canceled === 'true') {
      setStatus('cancel');
      setMessage('Vous avez annulé le processus de souscription.');
      onCancel?.();
    }
  }, [searchParams, onSuccess, onCancel]);

  // Nettoyer l'URL après affichage
  useEffect(() => {
    if (status !== 'idle' && status !== 'processing') {
      // Attendre un peu puis nettoyer l'URL
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('success');
          url.searchParams.delete('canceled');
          url.searchParams.delete('provider');
          window.history.replaceState({}, '', url.toString());
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === 'idle') return null;

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="w-6 h-6 text-green-500" />,
      title: 'Abonnement confirmé !',
      text: 'text-green-800',
    },
    cancel: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <XCircle className="w-6 h-6 text-amber-500" />,
      title: 'Souscription annulée',
      text: 'text-amber-800',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <XCircle className="w-6 h-6 text-red-500" />,
      title: 'Une erreur est survenue',
      text: 'text-red-800',
    },
    processing: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />,
      title: 'Traitement en cours...',
      text: 'text-blue-800',
    },
  };

  const style = styles[status];

  return (
    <div className={`rounded-lg p-4 mb-6 ${style.bg} border ${style.border}`}>
      <div className="flex items-start gap-3">
        {style.icon}
        <div>
          <h3 className={`font-semibold ${style.text}`}>{style.title}</h3>
          {message && (
            <p className={`text-sm mt-1 ${style.text} opacity-90`}>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PayPalRedirectHandler;
