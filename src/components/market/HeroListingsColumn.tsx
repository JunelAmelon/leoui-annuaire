'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MarketListing } from '@/lib/market/types';
import { Plus } from 'lucide-react';

// Colonne droite du hero — 3 dernières annonces RÉELLES (prix, titre, ville).
// Si pas encore d'annonces : cartes visuelles sobres pointant vers le dépôt.
export default function HeroListingsColumn() {
  const [listings, setListings] = useState<MarketListing[] | null>(null);

  useEffect(() => {
    fetch('/api/market/listings?limit=3&sort=recent')
      .then((r) => r.json())
      .then((json) => setListings(json?.ok ? json.listings : []))
      .catch(() => setListings([]));
  }, []);

  // État vide : CTA pleine hauteur, pas de fausses données.
  if (listings !== null && listings.length === 0) {
    return (
      <Link
        href="/market/deposer-une-annonce"
        className="group relative rounded-none sm:rounded-[28px] overflow-hidden bg-charcoal-800 min-h-[240px] lg:min-h-[560px] flex flex-col items-center justify-center text-center p-8 hover:bg-charcoal-800/90 transition-colors h-full"
      >
        <span className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center mb-4">
          <Plus className="w-5 h-5 text-white" />
        </span>
        <p className="font-serif text-white text-xl mb-2">Votre article ici</p>
        <p className="text-white/50 text-sm max-w-[22ch]">
          Soyez le premier vendeur de LeOui Market
        </p>
      </Link>
    );
  }

  const cards = listings ?? [];

  return (
    <div className="grid grid-cols-3 lg:grid-cols-1 lg:grid-rows-3 gap-3 lg:min-h-[560px] h-full">
      {cards.map((l) => (
        <Link
          key={l.id}
          href={`/market/produit/${l.slug}`}
          className="group relative rounded-none sm:rounded-[28px] overflow-hidden bg-charcoal-900 min-h-[180px] lg:min-h-0"
        >
          {l.images?.[0] ? (
            <img
              src={l.images[0]}
              alt={l.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="absolute inset-0 bg-charcoal-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/70 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <span className="inline-block bg-white/95 text-charcoal-900 text-[0.7rem] font-semibold px-2.5 py-1 rounded-full mb-1.5">
              {l.price.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
            <p className="text-white text-xs font-medium leading-tight line-clamp-1">{l.title}</p>
            <p className="text-white/60 text-[0.65rem]">{l.location?.city || 'France'}</p>
          </div>
        </Link>
      ))}
      {/* Complète la colonne si moins de 3 annonces */}
      {listings !== null && cards.length > 0 && cards.length < 3 && (
        <Link
          href="/market/deposer-une-annonce"
          className="group relative rounded-none sm:rounded-[28px] overflow-hidden bg-charcoal-800/60 border border-dashed border-white/15 min-h-[180px] lg:min-h-0 flex flex-col items-center justify-center text-center p-6 hover:border-rose-400 transition-colors"
        >
          <Plus className="w-4 h-4 text-rose-400 mb-2" />
          <p className="text-white/70 text-xs font-medium">Votre article ici</p>
        </Link>
      )}
      {/* Skeleton pendant le chargement */}
      {listings === null &&
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[28px] bg-charcoal-800/60 animate-pulse min-h-[180px] lg:min-h-0" />
        ))}
    </div>
  );
}
