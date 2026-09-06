'use client';

import React from 'react';
import { Check, Star, Loader2 } from 'lucide-react';
import { PayPalButton } from './PayPalButton';
import { usePayPalSubscription } from './usePayPalSubscription';
import type { PricingCard, SubscriptionTier } from './types';

interface PayPalSubscriptionCardProps {
  card: PricingCard;
  currentTier?: SubscriptionTier;
  onTierChange?: (tier: SubscriptionTier) => void;
  className?: string;
}

/**
 * Carte d'abonnement PayPal avec bouton d'action
 * 
 * Affiche les détails du plan et permet la souscription via PayPal
 */
export function PayPalSubscriptionCard({
  card,
  currentTier = 'free',
  onTierChange,
  className = '',
}: PayPalSubscriptionCardProps) {
  const { initiateCheckout, manageSubscription, isLoading } = usePayPalSubscription({
    onSuccess: () => onTierChange?.(card.id),
    onError: (err) => console.error('PayPal error:', err),
  });

  const isCurrentPlan = currentTier === card.id;
  const isDowngrade = getTierValue(currentTier) > getTierValue(card.id);
  const isUpgrade = getTierValue(currentTier) < getTierValue(card.id);

  // Déterminer le bouton d'action
  const renderActionButton = () => {
    if (card.id === 'free') {
      return (
        <button
          disabled
          className="w-full py-3 px-4 rounded-lg bg-charcoal-100 text-charcoal-500 font-medium cursor-default"
        >
          Plan gratuit
        </button>
      );
    }

    if (isCurrentPlan) {
      return (
        <button
          onClick={manageSubscription}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-lg bg-white border-2 border-gold-400 text-gold-600 font-medium hover:bg-gold-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement...
            </>
          ) : (
            'Gérer mon abonnement'
          )}
        </button>
      );
    }

    // Utiliser le bouton PayPal si un planId existe
    if (card.paypalPlanId) {
      return (
        <PayPalButton
          planId={card.paypalPlanId}
          style={{
            layout: 'vertical',
            color: isPopular ? 'gold' : 'blue',
            shape: 'rect',
            label: 'subscribe',
            height: 45,
            tagline: false,
          }}
          onSubscriptionCreated={(id) => {
            console.log('Subscription created:', id);
            onTierChange?.(card.id);
          }}
          onError={(err) => console.error('PayPal error:', err)}
          disabled={isLoading}
        />
      );
    }

    // Fallback: bouton classique avec redirection
    return (
      <button
        onClick={() => initiateCheckout(card.id)}
        disabled={isLoading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
          isPopular
            ? 'bg-gold-500 text-white hover:bg-gold-600 shadow-lg shadow-gold-500/25'
            : 'bg-rose-600 text-white hover:bg-rose-700'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirection...
          </>
        ) : (
          getButtonLabel()
        )}
      </button>
    );
  };

  const getButtonLabel = () => {
    if (isUpgrade) return 'Passer à ce plan';
    if (isDowngrade) return 'Passer à ce plan';
    return 'S\'abonner';
  };

  const isPopular = card.isPopular;

  return (
    <div
      className={`relative rounded-2xl p-6 transition-all duration-300 ${
        isPopular
          ? 'bg-gradient-to-b from-gold-50 to-white border-2 border-gold-400 shadow-xl shadow-gold-500/10 scale-105'
          : 'bg-white border border-charcoal-200 hover:border-charcoal-300 hover:shadow-lg'
      } ${className}`}
    >
      {/* Badge Popular */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gold-500 text-white text-xs font-semibold shadow-md">
            <Star className="w-3 h-3" />
            Populaire
          </span>
        </div>
      )}

      {/* Badge Current Plan */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Plan actuel
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className={`text-xl font-bold mb-2 ${isPopular ? 'text-gold-700' : 'text-charcoal-900'}`}>
          {card.name}
        </h3>
        <p className="text-sm text-charcoal-500 mb-4">{card.description}</p>
        
        {/* Prix */}
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-charcoal-900">
            {card.price === 0 ? 'Gratuit' : `${card.price}€`}
          </span>
          {card.price > 0 && (
            <span className="text-charcoal-500">/{card.period === 'month' ? 'mois' : 'an'}</span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {card.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isPopular ? 'text-gold-500' : 'text-green-500'}`} />
            <span className="text-sm text-charcoal-600">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Action Button */}
      <div className="mt-auto">
        {renderActionButton()}
      </div>
    </div>
  );
}

/**
 * Helper pour obtenir la valeur numérique d'un tier
 */
function getTierValue(tier: SubscriptionTier): number {
  const values: Record<SubscriptionTier, number> = {
    free: 0,
    starter: 1,
    pro: 2,
    elite: 3,
  };
  return values[tier] ?? 0;
}

export default PayPalSubscriptionCard;
