'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, MapPin, Heart, Zap, Tag, Banknote } from 'lucide-react';

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
  description?: string;
  hasPromo?: boolean;
  responseTime?: string;
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
            description: d.description || d.shortDescription || '',
            hasPromo: d.hasPromo || d.promotions?.length > 0 || false,
            responseTime: d.responseTime || '24h',
          }));
        setVendors(mapped.length > 0 ? mapped : STATIC_FALLBACK);
      })
      .catch(() => setVendors(STATIC_FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {vendors.slice(0, 4).map((v) => {
        const img = v.images?.[0] || v.imageUrl || '';
        const displayPrice = v.startingPrice?.replace('À partir de ', '') || '';
        return (
          <div
            key={v.id}
            className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              {img && (
                <img
                  src={img}
                  alt={v.name}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Heart favorite */}
              <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
                <Heart className="w-4 h-4 text-gray-400" />
              </button>
              {/* Dots indicator (single image = 1 dot) */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white"></span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Title */}
              <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
                {v.name}
              </h3>

              {/* Rating & Location */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                {v.rating && v.rating > 0 && (
                  <>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-gray-900">{v.rating.toFixed(1)}</span>
                    {(v.reviewCount ?? 0) > 0 && <span>({v.reviewCount})</span>}
                    <span className="text-gray-300">·</span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {v.location || 'France'}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {v.description || `Photographe professionnel spécialisé dans les mariages. Capture avec précision les moments et les émotions de votre journée.`}
              </p>

              {/* Price & Promo */}
              <div className="flex items-center gap-3 mb-4">
                {displayPrice && (
                  <span className="flex items-center gap-1 text-sm text-gray-700">
                    <Banknote className="w-4 h-4 text-gray-500" />
                    À partir de {displayPrice}
                  </span>
                )}
                {v.hasPromo && (
                  <span className="flex items-center gap-1 text-sm text-rose-600">
                    <Tag className="w-4 h-4" /> 1 promotion
                  </span>
                )}
              </div>

              {/* CTA Button */}
              <Link
                href={`/vendors/${v.id}`}
                className="block w-full bg-rose-500 hover:bg-rose-600 text-white text-center font-medium py-3 rounded-lg transition-colors"
              >
                Plus d'informations
              </Link>

              {/* Response time */}
              <div className="flex items-center justify-center gap-1 mt-3 text-xs text-gray-500">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                Réponse en {v.responseTime || '24 heures'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
