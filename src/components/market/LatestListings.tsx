'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ListingCard from './ListingCard';
import { MarketListing } from '@/lib/market/types';
import { Plus } from 'lucide-react';

// Dernières annonces — vraies données, élément central du catalogue (type leboncoin).
export default function LatestListings({ limit = 8 }: { limit?: number }) {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/market/listings?limit=${limit}&sort=recent`)
      .then((r) => r.json())
      .then((json) => setListings(json?.ok ? json.listings : []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-charcoal-100/60 aspect-[3/4] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="rounded-2xl border border-dashed border-charcoal-200 bg-white py-14 text-center">
        <p className="text-charcoal-500 font-medium">Les premières annonces arrivent</p>
        <p className="text-sm text-charcoal-400 mt-1">Soyez parmi les premiers vendeurs de LeOui Market</p>
        <Link
          href="/market/deposer-une-annonce"
          className="inline-flex items-center gap-1.5 mt-5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
        >
          <Plus className="w-4 h-4" /> Déposer une annonce
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
