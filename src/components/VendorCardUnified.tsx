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
import { MapPin, Star, Heart, BadgeCheck, Award, Crown, ChevronRight } from 'lucide-react';
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

  // Si horizontal (mode liste)
  if (variant === 'horizontal') {
    return (
      <article className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col sm:flex-row group">
        {/* Image */}
        <div className="sm:w-44 h-40 sm:h-auto flex-shrink-0 overflow-hidden relative">
          <Link href={`${hrefBase}/${id}`}>
            <img 
              src={displayImage} 
              alt={name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
          </Link>
          {featured && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-rose-500 text-white text-xs font-semibold rounded-lg">
              À la une
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <Link href={`${hrefBase}/${id}`}>
                  <h3 className="font-serif text-charcoal-900 text-lg font-light hover:text-rose-600 transition-colors">
                    {name}
                  </h3>
                </Link>
              </div>
              {showFavorite && (
                <button 
                  onClick={() => onFavoriteToggle?.(id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors ml-2 flex-shrink-0"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'text-rose-500 fill-rose-500' : 'text-charcoal-300 hover:text-rose-500'}`} />
                </button>
              )}
            </div>
            
            {/* Badges Row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-medium text-charcoal-500 bg-stone-100 px-2 py-0.5 rounded-full">
                {category}
              </span>
              {tierBadge && TierIcon && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${getTierStyles()}`}>
                  <TierIcon className="w-3 h-3" />
                  {tierBadge.label}
                </span>
              )}
              {location && (
                <span className="text-xs text-charcoal-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {location}
                </span>
              )}
              {rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-semibold text-charcoal-700">{rating.toFixed(1)}</span>
                  <span className="text-xs text-charcoal-400">({reviewCount})</span>
                </div>
              )}
            </div>
            
            {description && (
              <p className="text-sm text-charcoal-500 line-clamp-2 leading-relaxed">{description}</p>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
            <div className="flex items-center gap-3">
              {startingPrice && (
                <span className="text-sm text-charcoal-700">
                  À partir de <strong>{startingPrice}</strong>
                </span>
              )}
              {hasPromo && (
                <span className="text-xs text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full">
                  Promo
                </span>
              )}
            </div>
            
            {/* CTA Button - Style exact comme espace public */}
            <Link
              href={`${hrefBase}/${id}`}
              className="group inline-flex items-center justify-center gap-1.5 bg-white border border-rose-200 text-charcoal-700 hover:border-rose-400 hover:bg-rose-50 font-medium px-3 sm:px-4 py-2 rounded-full text-sm transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap flex-shrink-0"
            >
              <span className="hidden sm:inline">Voir le profil</span>
              <span className="sm:hidden text-xs">Voir profil</span>
              <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-rose-100 rounded-full group-hover:bg-rose-500 transition-colors duration-200 flex-shrink-0">
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500 group-hover:text-white" />
              </span>
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Compact (mode grid simplifié)
  if (variant === 'compact') {
    return (
      <Link href={`${hrefBase}/${id}`} className="group cursor-pointer">
        <article className="relative h-60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
          <img 
            src={displayImage} 
            alt={name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          
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
          
          {/* Content */}
          <div className="absolute bottom-0 p-4 w-full">
            <p className="text-[0.65rem] text-white/60 mb-0.5 uppercase tracking-wider">{category}</p>
            <h3 className="font-serif text-white font-light text-base">{name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              {rating > 0 && (
                <>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs text-white/80">{rating.toFixed(1)}</span>
                </>
              )}
              {startingPrice && <span className="text-xs text-white/50">· {startingPrice}</span>}
            </div>
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
              <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-full">
                Promo
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
