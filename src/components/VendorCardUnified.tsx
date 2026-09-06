/**
 * VendorCardUnified - Composant de carte prestataire unifié
 * Utilisé sur le site public ET l'espace client
 * 
 * Features:
 * - Badge de formule d'abonnement (Elite, Pro, Starter)
 * - Design cohérent entre tous les espaces
 * - Responsive et accessible
 */

import Link from 'next/link';
import { MapPin, Star, Heart, BadgeCheck, Award, Crown, ChevronRight, Zap, Tag, Gift } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import { TIER_BADGE } from '@/lib/subscription-plans';

interface VendorCardUnifiedProps {
  id: string;
  name: string;
  category: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl: string;
  images?: string[];
  startingPrice?: string;
  subscriptionTier?: SubscriptionTier;
  description?: string;
  hasPromo?: boolean;
  hrefBase?: string;
  featured?: boolean;
  showFavorite?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
  variant?: 'default' | 'compact' | 'horizontal';
}

// Icônes par tier
const TIER_ICONS: Record<SubscriptionTier, typeof Crown | null> = {
  free: null,
  starter: BadgeCheck,
  pro: Award,
  elite: Crown,
};

export default function VendorCardUnified({
  id,
  name,
  category,
  location,
  rating = 0,
  reviewCount = 0,
  imageUrl,
  images = [],
  startingPrice,
  subscriptionTier = 'free',
  description,
  hasPromo = false,
  hrefBase = '/vendors',
  featured = false,
  showFavorite = false,
  isFavorite = false,
  onFavoriteToggle,
  variant = 'default',
}: VendorCardUnifiedProps) {
  const tierBadge = TIER_BADGE[subscriptionTier];
  const TierIcon = TIER_ICONS[subscriptionTier];
  const displayImage = images[0] || imageUrl || '/placeholder-vendor.jpg';
  
  // Style du badge selon le tier
  const getTierStyles = () => {
    switch (subscriptionTier) {
      case 'elite':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'pro':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'starter':
        return 'bg-stone-100 text-stone-600 border-stone-200';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  // Si horizontal (mode liste) - Style EXACT comme site public vendors/page.tsx
  if (variant === 'horizontal') {
    return (
      <article className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col sm:flex-row border-0 sm:border sm:border-charcoal-100 group">
        {/* Image */}
        <Link href={`${hrefBase}/${id}`} className="sm:w-48 h-44 sm:h-auto flex-shrink-0 overflow-hidden relative">
          <img
            src={displayImage}
            alt={name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
          {tierBadge && (
            <span className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1 ${getTierStyles()}`}>
              <Crown className="w-2.5 h-2.5" />{tierBadge.label}
            </span>
          )}
        </Link>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-1">
              <Link href={`${hrefBase}/${id}`}>
                <h3 className="font-serif text-heading-md text-charcoal-900 hover:text-rose-600 transition-colors">
                  {name}
                </h3>
              </Link>
              {showFavorite && (
                <button
                  onClick={() => onFavoriteToggle?.(id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors ml-2 flex-shrink-0"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-charcoal-400 hover:text-rose-500'}`} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`} />
                ))}
              </div>
              <span className="text-sm font-semibold text-charcoal-900">{rating || '0.0'}</span>
              <span className="text-sm text-charcoal-500">({reviewCount || 0})</span>
              <span className="text-charcoal-300">·</span>
              <span className="text-sm text-charcoal-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {location || 'France'}
              </span>
            </div>
            {hasPromo && (
              <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5 mb-2">
                <Gift className="w-3 h-3" /> Promo en cours
              </p>
            )}
            <p className="text-sm text-charcoal-600 line-clamp-2 leading-relaxed">
              {description || `${category} professionnel pour votre mariage.`}
            </p>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-charcoal-100 gap-2">
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-sm text-charcoal-700 flex items-center gap-1.5 font-medium">
                À partir de <span className="text-charcoal-900 font-semibold">{startingPrice || '-'}</span>
              </span>
              {/* promo badge moved to image */}
            </div>
            <div className="flex items-center justify-end gap-2 flex-shrink-0">
              <span className="hidden sm:flex text-xs text-charcoal-500 items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Réponse rapide
              </span>
              <Link
                href={`${hrefBase}/${id}`}
                className="group inline-flex items-center justify-center gap-1.5 bg-white border border-rose-200 text-charcoal-700 hover:border-rose-400 hover:bg-rose-50 font-medium px-3 sm:px-4 py-2 rounded-full text-sm transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap flex-shrink-0"
              >
                <span className="hidden sm:inline">Voir le profil</span>
                <span className="sm:hidden text-xs">Voir profil</span>
                <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-rose-100 rounded-full group-hover:bg-rose-500 transition-colors duration-200 flex-shrink-0">
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500 group-hover:text-white animate-[bounce-x_1s_ease-in-out_infinite]" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }

  // Compact (mode grid) - Style EXACT comme site public vendors/page.tsx vue Photos
  if (variant === 'compact') {
    return (
      <Link href={`${hrefBase}/${id}`} className="group block">
        <article className="relative h-64 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
          <img
            src={displayImage}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Favorite */}
          {showFavorite && (
            <button
              onClick={(e) => { e.preventDefault(); onFavoriteToggle?.(id); }}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-charcoal-500'}`} />
            </button>
          )}

          {/* Tier Badge */}
          {tierBadge && (
            <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${getTierStyles()}`}>
              {TierIcon && <TierIcon className="w-3 h-3" />}
              {tierBadge.label}
            </div>
          )}

          {/* Content - Style exact site public */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < Math.floor(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-white/25'}`} />
                ))}
              </div>
              <span className="text-xs text-white/80 font-medium">{rating || '0.0'}</span>
            </div>
            {hasPromo && (
              <p className="text-xs text-rose-300 font-medium truncate flex items-center gap-1 mb-0.5">
                <Gift className="w-3 h-3" /> Promo en cours
              </p>
            )}
            <p className="text-white font-semibold text-sm truncate">{name}</p>
            <p className="text-xs text-white/70 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {location || 'France'}
            </p>
          </div>
        </article>
      </Link>
    );
  }

  // Default (mode standard - site public)
  return (
    <Link href={`${hrefBase}/${id}`} className="group block">
      <article className="bg-white border border-charcoal-100 overflow-hidden hover:shadow-lg transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <img 
            src={displayImage} 
            alt={name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          
          {/* Favorite */}
          {showFavorite && (
            <button 
              onClick={(e) => { e.preventDefault(); onFavoriteToggle?.(id); }}
              className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-charcoal-700'}`} />
            </button>
          )}
          
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-serif text-charcoal-900 text-lg leading-tight mb-1">
            {name}
          </h3>

          {/* Rating & Location */}
          <div className="flex items-center gap-2 text-sm text-charcoal-500 mb-2">
            {rating > 0 && (
              <>
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-semibold text-charcoal-900">{rating.toFixed(1)}</span>
                {reviewCount > 0 && <span>({reviewCount})</span>}
                <span className="text-charcoal-300">·</span>
              </>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {location}
              </span>
            )}
          </div>

          {/* Tier Badge */}
          {tierBadge && TierIcon && (
            <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border mb-3 ${getTierStyles()}`}>
              <TierIcon className="w-3.5 h-3.5" />
              {tierBadge.label}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-charcoal-600 line-clamp-2 mb-3">
            {description || `${category} professionnel pour votre mariage.`}
          </p>

          {/* Price & Promo */}
          <div className="flex items-center justify-between mb-4">
            {startingPrice && (
              <span className="text-sm font-medium text-charcoal-900">
                À partir de {startingPrice}
              </span>
            )}
            {hasPromo && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                <Gift className="w-3 h-3" /> Promo
              </span>
            )}
          </div>

          {/* CTA Button - Style unifié rose */}
          <div className="w-full bg-rose-600 hover:bg-rose-700 text-white text-center font-medium py-3 transition-colors tracking-wide rounded-none">
            Voir le profil
          </div>
        </div>
      </article>
    </Link>
  );
}
