'use client';

import Link from 'next/link';
import { MapPin, Truck, Handshake, ArrowRight } from 'lucide-react';
import { MarketListing } from '@/lib/market/types';
import { CONDITION_LABELS, MARKET_CATEGORIES } from '@/lib/market/categories';

const CATEGORY_LABELS = new Map(MARKET_CATEGORIES.map((c) => [c.slug, c.label]));

const CONDITION_CLS: Record<string, string> = {
  neuf: 'bg-green-50 text-green-700 border-green-200',
  comme_neuf: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bon_etat: 'bg-amber-50 text-amber-700 border-amber-200',
  usage: 'bg-charcoal-50 text-charcoal-600 border-charcoal-200',
};

/**
 * Ligne horizontale catalogue — image pleine hauteur à gauche, contenu à droite.
 * Même langage visuel que ListingCard : rounded-2xl, bordure douce, hover shadow.
 */
export default function ListingRow({ listing }: { listing: MarketListing }) {
  const img = listing.images?.[0];
  const categoryLabel = CATEGORY_LABELS.get(listing.category) || '';

  return (
    <Link
      href={`/market/produit/${listing.slug}`}
      className="group flex bg-white rounded-2xl border border-charcoal-100 overflow-hidden hover:shadow-lg hover:border-rose-200 transition-all duration-200"
    >
      {/* Image — pleine hauteur, épouse le bord gauche de la carte */}
      <div className="relative w-28 sm:w-44 flex-shrink-0 bg-charcoal-50">
        {img ? (
          <img
            src={img}
            alt={listing.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-charcoal-300 text-xs">
            Pas de photo
          </div>
        )}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 text-[0.62rem] font-semibold rounded-full border bg-white/95 backdrop-blur-sm ${
            CONDITION_CLS[listing.condition] || CONDITION_CLS.usage
          }`}
        >
          {CONDITION_LABELS[listing.condition] || listing.condition}
        </span>
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-4 sm:px-6 sm:py-5">
        {/* Texte */}
        <div className="flex-1 min-w-0">
          {categoryLabel && (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-rose-600 mb-1 truncate">
              {categoryLabel}
            </p>
          )}
          <h3 className="font-serif text-base sm:text-xl text-charcoal-900 leading-snug line-clamp-2 group-hover:text-rose-600 transition-colors">
            {listing.title}
          </h3>
          <div className="mt-2 flex items-center gap-3 text-xs sm:text-sm text-charcoal-500">
            <span className="flex items-center gap-1 min-w-0">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{listing.location?.city || 'France'}</span>
            </span>
            <span className="flex items-center gap-1.5 text-charcoal-400 flex-shrink-0">
              {listing.delivery?.shipping && <Truck className="w-4 h-4" aria-label="Livraison possible" />}
              {listing.delivery?.pickup && <Handshake className="w-4 h-4" aria-label="Remise en main propre" />}
            </span>
          </div>
        </div>

        {/* Prix + action */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 flex-shrink-0 border-t sm:border-t-0 border-charcoal-50 pt-3 sm:pt-0">
          <span className="font-serif text-xl sm:text-2xl text-charcoal-900 whitespace-nowrap">
            {listing.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-charcoal-400 group-hover:text-rose-600 transition-colors">
            <span className="hidden sm:inline">Voir l'annonce</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
