'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, MapPin, ArrowRight, Crown } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  images?: string[];
  imageUrl?: string;
  startingPrice?: string;
  subscriptionTier?: string;
}

const STATIC_FALLBACK = [
  { id: 'atelier-lumiere', name: 'Atelier Lumière', category: 'Photographie', location: 'Paris', rating: 4.9, reviewCount: 127, startingPrice: 'À partir de 2 500 €', images: ['https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'premium' },
  { id: 'maison-florale', name: 'Maison Florale', category: 'Fleuriste', location: 'Lyon', rating: 4.8, reviewCount: 98, startingPrice: 'À partir de 1 800 €', images: ['https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'standard' },
  { id: 'saveurs-et-delices', name: 'Saveurs & Délices', category: 'Traiteur', location: 'Provence', rating: 5.0, reviewCount: 156, startingPrice: 'À partir de 85 €/pers', images: ['https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'premium' },
  { id: 'harmonie-musicale', name: 'Harmonie Musicale', category: 'DJ & Musique', location: 'Bordeaux', rating: 4.9, reviewCount: 84, startingPrice: 'À partir de 1 200 €', images: ['https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'standard' },
];

export default function HomeFeaturedVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/vendors')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        const docs = Array.isArray(json.vendors) ? json.vendors : [];
        const tierOrder: Record<string, number> = { premium: 3, standard: 2, free: 1 };
        const mapped = (docs as any[])
          .filter(d => d.name && d.status !== 'inactive')
          .sort((a, b) => {
            const tierA = tierOrder[a.subscriptionTier || 'free'] || 0;
            const tierB = tierOrder[b.subscriptionTier || 'free'] || 0;
            if (tierA !== tierB) return tierB - tierA;
            return (b.rating || 0) - (a.rating || 0);
          })
          .slice(0, 4)
          .map(d => ({
            id: d.id,
            name: d.name,
            category: d.category || '',
            location: (d.location || '').split(',')[0].trim(),
            rating: d.rating || 0,
            reviewCount: d.reviewCount || 0,
            images: d.images || [],
            imageUrl: d.images?.[0] || d.imageUrl || '',
            startingPrice: d.startingPrice ? `À partir de ${d.startingPrice}` : '',
            subscriptionTier: d.subscriptionTier || 'free',
          }));
        setVendors(mapped.length > 0 ? mapped : STATIC_FALLBACK);
      })
      .catch(() => setVendors(STATIC_FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="border border-charcoal-100 bg-white overflow-hidden animate-pulse">
          <div className="h-52 bg-charcoal-100" />
          <div className="p-4 space-y-2.5">
            <div className="h-3 w-24 bg-charcoal-100 rounded" />
            <div className="h-5 w-40 bg-charcoal-100 rounded" />
            <div className="h-3 w-28 bg-charcoal-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  if (vendors.length === 0) return (
    <div className="py-12 text-center text-charcoal-400 text-sm">Aucun prestataire disponible pour le moment.</div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {vendors.map((v, i) => {
        const img = v.images?.[0] || v.imageUrl || '';
        return (
          <Link
            key={v.id}
            href={`/vendors/${v.id}`}
            className="group bg-white border border-charcoal-100 overflow-hidden shadow-soft hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="relative h-52 overflow-hidden bg-stone-100">
              {img && (
                <img
                  src={img}
                  alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              )}
              {v.subscriptionTier === 'premium' && (
                <div className="absolute left-3 top-3 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.1em] font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-white flex items-center gap-1">
                  <Crown className="w-3 h-3" /> PREMIUM
                </div>
              )}
            </div>

            <div className="p-4">
              <p className="text-[0.65rem] font-semibold text-charcoal-400 tracking-[0.1em] uppercase mb-1.5">{v.category}</p>
              <h3
                className="font-serif text-charcoal-900 group-hover:text-rose-700 transition-colors duration-200"
                style={{ fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)', fontWeight: 500, letterSpacing: '-0.005em' }}
              >
                {v.name}
              </h3>
              {v.location && (
                <p className="text-charcoal-500 text-xs font-medium mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {v.location}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
              {v.rating && v.rating > 0 ? (
                  <div className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-champagne-500 fill-champagne-500" />
                  <span className="text-sm font-medium text-charcoal-900">{v.rating.toFixed(1)}</span>
                  {(v.reviewCount ?? 0) > 0 && <span className="text-xs text-charcoal-400">({v.reviewCount})</span>}
                </div>
                ) : <span />}
                <ArrowRight className="w-4 h-4 text-charcoal-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </div>
              {v.startingPrice && <p className="text-xs text-charcoal-500 font-light mt-2">{v.startingPrice}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
