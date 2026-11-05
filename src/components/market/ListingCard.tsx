'use client';

import Link from 'next/link';
import { MapPin, Truck, Handshake } from 'lucide-react';
import { MarketListing } from '@/lib/market/types';
import { CONDITION_LABELS } from '@/lib/market/categories';

const CONDITION_CLS: Record<string, string> = {
  neuf: 'bg-green-50 text-green-700 border-green-200',
  comme_neuf: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bon_etat: 'bg-amber-50 text-amber-700 border-amber-200',
  usage: 'bg-charcoal-50 text-charcoal-600 border-charcoal-200',
};

export default function ListingCard({ listing }: { listing: MarketListing }) {
  const img = listing.images?.[0];
  return (
    <Link
      href={`/market/produit/${listing.slug}`}
      className="group bg-white rounded-2xl border border-charcoal-100 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-charcoal-50 overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-charcoal-300 text-sm">
            Pas de photo
          </div>
        )}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 text-[0.68rem] font-semibold rounded-full border ${
            CONDITION_CLS[listing.condition] || CONDITION_CLS.usage
          }`}
        >
          {CONDITION_LABELS[listing.condition] || listing.condition}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <h3 className="font-serif text-base text-charcoal-900 group-hover:text-rose-600 transition-colors line-clamp-2 leading-snug">
          {listing.title}
        </h3>
        <p className="text-sm text-charcoal-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{listing.location?.city || 'France'}</span>
        </p>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-lg font-semibold text-charcoal-900">
            {listing.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
          <span className="flex items-center gap-1.5 text-charcoal-400">
            {listing.delivery?.shipping && <Truck className="w-4 h-4" aria-label="Livraison possible" />}
            {listing.delivery?.pickup && <Handshake className="w-4 h-4" aria-label="Remise en main propre" />}
          </span>
        </div>
      </div>
    </Link>
  );
}
