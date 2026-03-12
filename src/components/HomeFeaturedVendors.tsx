'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDocuments } from '@/lib/db';
import { Star, MapPin, ArrowRight } from 'lucide-react';

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
}

const STATIC_FALLBACK = [
  { id: 'atelier-lumiere', name: 'Atelier Lumière', category: 'Photographie', location: 'Paris', rating: 4.9, reviewCount: 127, startingPrice: 'À partir de 2 500 €', images: ['https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=500'] },
  { id: 'maison-florale', name: 'Maison Florale', category: 'Fleuriste', location: 'Lyon', rating: 4.8, reviewCount: 98, startingPrice: 'À partir de 1 800 €', images: ['https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=500'] },
  { id: 'saveurs-et-delices', name: 'Saveurs & Délices', category: 'Traiteur', location: 'Provence', rating: 5.0, reviewCount: 156, startingPrice: 'À partir de 85 €/pers', images: ['https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=500'] },
  { id: 'harmonie-musicale', name: 'Harmonie Musicale', category: 'DJ & Musique', location: 'Bordeaux', rating: 4.9, reviewCount: 84, startingPrice: 'À partir de 1 200 €', images: ['https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=500'] },
];

export default function HomeFeaturedVendors() {
  const [vendors, setVendors] = useState<Vendor[]>(STATIC_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocuments('vendors', [])
      .then(docs => {
        if (docs.length > 0) {
          // Sort by rating desc, take top 4
          const sorted = (docs as any[])
            .filter(d => d.name && d.status !== 'inactive')
            .sort((a, b) => ((b.rating || 0) - (a.rating || 0)))
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
            }));
          if (sorted.length > 0) setVendors(sorted);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-0 divide-y divide-charcoal-100">
      {vendors.map((v, i) => {
        const img = v.images?.[0] || v.imageUrl || '';
        return (
          <Link
            key={v.id}
            href={`/vendors/${v.id}`}
            className="group flex items-center gap-4 lg:gap-10 py-6 lg:py-7 hover:bg-white/60 transition-colors duration-200 px-2"
          >
            <span
              className="hidden sm:block font-serif text-charcoal-200 text-3xl flex-shrink-0 w-8 text-right"
              style={{ fontWeight: 300, fontStyle: 'italic', lineHeight: 1 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="w-20 h-20 lg:w-28 lg:h-20 flex-shrink-0 overflow-hidden bg-stone-100">
              {img && (
                <img src={img} alt={v.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.65rem] font-semibold text-charcoal-400 tracking-[0.1em] uppercase mb-1">{v.category}</p>
              <h3
                className="font-serif text-charcoal-900 group-hover:text-rose-700 transition-colors duration-200"
                style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 400, letterSpacing: '-0.005em' }}
              >
                {v.name}
              </h3>
              {v.location && (
                <p className="text-charcoal-500 text-xs font-medium mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {v.location}
                </p>
              )}
            </div>
            <div className="hidden md:flex flex-col items-end gap-1 flex-shrink-0">
              {v.rating && v.rating > 0 ? (
                <div className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-champagne-500 fill-champagne-500" />
                  <span className="text-sm font-medium text-charcoal-900">{v.rating.toFixed(1)}</span>
                  {(v.reviewCount ?? 0) > 0 && <span className="text-xs text-charcoal-400">({v.reviewCount})</span>}
                </div>
              ) : null}
              {v.startingPrice && <span className="text-xs text-charcoal-500 font-light">{v.startingPrice}</span>}
            </div>
            <ArrowRight className="w-4 h-4 text-charcoal-300 group-hover:text-rose-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}
