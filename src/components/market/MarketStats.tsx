'use client';

import { useEffect, useState } from 'react';
import { MARKET_CATEGORIES } from '@/lib/market/categories';
import { MarketListing } from '@/lib/market/types';

// Carte stats live (style « 15 lbs + bar chart » de la référence) :
// compteur d'annonces en ligne + répartition réelle par catégorie.
export default function MarketStats() {
  const [listings, setListings] = useState<MarketListing[] | null>(null);

  useEffect(() => {
    fetch('/api/market/listings?limit=60')
      .then((r) => r.json())
      .then((json) => setListings(json?.ok ? json.listings : []))
      .catch(() => setListings([]));
  }, []);

  const total = listings?.length ?? 0;

  const byCat = MARKET_CATEGORIES.map((c) => ({
    label: c.label,
    count: listings?.filter((l) => l.category === c.slug).length ?? 0,
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const max = Math.max(...byCat.map((c) => c.count), 1);

  return (
    <div className="h-full flex flex-col">
      <p className="text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-charcoal-400 mb-3">
        En ligne maintenant
      </p>
      <p className="font-serif text-charcoal-900 leading-none mb-1" style={{ fontSize: 'clamp(2.8rem, 5vw, 4.2rem)', fontWeight: 300 }}>
        {listings === null ? '—' : total}
        <span className="text-lg text-charcoal-400 font-sans ml-2">annonces</span>
      </p>
      <p className="text-sm text-charcoal-500 mb-6">publiées par des particuliers</p>

      <div className="mt-auto space-y-2.5 pt-4">
        {byCat.map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-charcoal-600">{c.label}</span>
              <span className="text-charcoal-400 font-medium">{c.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-charcoal-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-rose-600 transition-all duration-700"
                style={{ width: `${Math.max((c.count / max) * 100, 3)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
