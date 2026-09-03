'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, MapPin, Heart, Zap, Tag, ChevronLeft, ChevronRight, Crown, Award, BadgeCheck } from 'lucide-react';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import { TIER_BADGE, TIER_WEIGHTS } from '@/lib/subscription-plans';

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
  subscriptionTier?: SubscriptionTier;
  description?: string;
  hasPromo?: boolean;
  responseTime?: string;
  vendorScore?: number;
}

// Mapping des anciens tiers vers les nouveaux
const TIER_MAPPING: Record<string, SubscriptionTier> = {
  premium: 'elite',
  standard: 'pro',
  basic: 'starter',
  free: 'free',
};

// Icônes par tier
const TIER_ICONS: Record<SubscriptionTier, typeof Crown | null> = {
  free: null,
  starter: BadgeCheck,
  pro: Award,
  elite: Crown,
};

const STATIC_FALLBACK = [
  { id: 'atelier-lumiere', name: 'Atelier Lumière', category: 'Photographie', location: 'Paris', rating: 4.9, reviewCount: 127, startingPrice: '2 500 €', images: ['https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'elite' as SubscriptionTier },
  { id: 'maison-florale', name: 'Maison Florale', category: 'Fleuriste', location: 'Lyon', rating: 4.8, reviewCount: 98, startingPrice: '1 800 €', images: ['https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'pro' as SubscriptionTier },
  { id: 'saveurs-et-delices', name: 'Saveurs & Délices', category: 'Traiteur', location: 'Provence', rating: 5.0, reviewCount: 156, startingPrice: '85 €/pers', images: ['https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'elite' as SubscriptionTier },
  { id: 'harmonie-musicale', name: 'Harmonie Musicale', category: 'DJ & Musique', location: 'Bordeaux', rating: 4.9, reviewCount: 84, startingPrice: '1 200 €', images: ['https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=500', 'https://images.pexels.com/photos/213207/pexels-photo-213207.jpeg?auto=compress&cs=tinysrgb&w=500'], subscriptionTier: 'pro' as SubscriptionTier },
];

function ImageSlider({ images, vendorName }: { images: string[]; vendorName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const allImages = images.length >= 3 ? images.slice(0, 3) : images;
  
  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % allImages.length);
  };
  
  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="relative h-48 overflow-hidden">
      {allImages.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-transform duration-500 ease-out ${
            idx === currentIndex ? 'translate-x-0' : 
            idx < currentIndex ? '-translate-x-full' : 'translate-x-full'
          }`}
        >
          <img
            src={img}
            alt={`${vendorName} - ${idx + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
      
      {/* Navigation Arrows */}
      {allImages.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronLeft className="w-4 h-4 text-charcoal-700" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronRight className="w-4 h-4 text-charcoal-700" />
          </button>
        </>
      )}
      
      {/* Heart favorite */}
      <button 
        onClick={(e) => e.preventDefault()}
        className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
      >
        <Heart className="w-4 h-4 text-gray-400" />
      </button>
      
      {/* Dots indicator */}
      {allImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {allImages.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-4' : 'bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomeFeaturedVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/vendors')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        const docs = Array.isArray(json.vendors) ? json.vendors : [];
        
        // 🔄 Utiliser vendorScore de l'API (formule + note + avis)
        const mapped = (docs as any[])
          .filter(d => d.name && d.status !== 'inactive')
          // Déjà triés par l'API, mais on s'assure qu'ils le sont
          .sort((a, b) => (b.vendorScore || 0) - (a.vendorScore || 0))
          .slice(0, 4)
          .map(d => {
            // Mapper l'ancien tier vers le nouveau si nécessaire
            const rawTier = d.subscriptionTier || 'free';
            const mappedTier = TIER_MAPPING[rawTier] || rawTier;
            
            return {
              id: d.id,
              name: d.name,
              category: d.category || '',
              location: (d.location || '').split(',')[0].trim(),
              rating: d.rating || 0,
              reviewCount: d.reviewCount || 0,
              images: d.images?.length >= 3 ? d.images.slice(0, 3) : d.images?.length > 0 ? d.images : [d.imageUrl || ''],
              imageUrl: d.images?.[0] || d.imageUrl || '',
              startingPrice: d.startingPrice || '',
              subscriptionTier: mappedTier as SubscriptionTier,
              description: d.description || d.shortDescription || '',
              hasPromo: d.hasPromo || d.promotions?.length > 0 || false,
              responseTime: d.responseTime || '24h',
              vendorScore: d.vendorScore || 0,
            };
          });
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

  // Fonction pour obtenir le style du badge selon le tier
  const getTierBadgeStyles = (tier: SubscriptionTier) => {
    switch (tier) {
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {vendors.slice(0, 4).map((v) => {
        const displayPrice = v.startingPrice || '';
        const tierBadge = v.subscriptionTier ? TIER_BADGE[v.subscriptionTier] : null;
        const TierIcon = v.subscriptionTier ? TIER_ICONS[v.subscriptionTier] : null;
        
        return (
          <Link
            key={v.id}
            href={`/vendors/${v.id}`}
            className="group bg-white border border-charcoal-100 overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col"
          >
            {/* 3-Image Slider */}
            <ImageSlider images={v.images || [v.imageUrl || '']} vendorName={v.name} />

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              {/* Title */}
              <h3 className="font-serif text-charcoal-900 text-lg leading-tight mb-1 min-h-[1.75rem]">
                {v.name}
              </h3>

              {/* Rating & Location */}
              <div className="flex items-center gap-2 text-sm text-charcoal-500 mb-2 min-h-[1.25rem]">
                {v.rating && v.rating > 0 && (
                  <>
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-semibold text-charcoal-900">{v.rating.toFixed(1)}</span>
                    {(v.reviewCount ?? 0) > 0 && <span>({v.reviewCount})</span>}
                    <span className="text-charcoal-300">·</span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {v.location || 'France'}
                </span>
              </div>

              {/* 🎖️ Tier Badge */}
              <div className="min-h-[1.75rem] mb-2">
                {tierBadge && TierIcon && (
                  <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border ${getTierBadgeStyles(v.subscriptionTier!)}`}>
                    <TierIcon className="w-3.5 h-3.5" />
                    {tierBadge.label}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-charcoal-600 line-clamp-2 mb-3 min-h-[2.5rem]">
                {v.description || `${v.category} professionnel pour votre mariage.`}
              </p>

              {/* Price & Promo */}
              <div className="flex items-center justify-between mb-4 min-h-[1.25rem] mt-auto">
                {displayPrice && (
                  <span className="text-sm font-medium text-charcoal-900">
                    À partir de {displayPrice}
                  </span>
                )}
                {v.hasPromo && (
                  <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1">
                    <Tag className="w-3 h-3" /> Promo
                  </span>
                )}
              </div>

              {/* CTA Button - Style unifié */}
              <div className="w-full bg-rose-600 hover:bg-rose-700 text-white text-center font-medium py-3 transition-colors tracking-wide">
                Voir le profil
              </div>

              {/* Response time */}
              <div className="flex items-center justify-center gap-1 mt-3 text-xs text-charcoal-400">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Réponse en {v.responseTime || '24h'}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
