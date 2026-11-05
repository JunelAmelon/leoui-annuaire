'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MARKET_CATEGORIES } from '@/lib/market/categories';
import { MarketListing } from '@/lib/market/types';
import { ArrowUpRight } from 'lucide-react';

// Photos par catégorie — contenu vérifié (images locales public/ + Pexels
// dont le contenu est confirmé par l'usage existant sur le site).
const CATEGORY_IMAGES: Record<string, string> = {
  'decoration': '/mariage%20(2).jpg',           // arche florale de cérémonie
  'art-de-la-table': '/mariage%20(3).jpg',      // longue table dressée + guirlandes
  'mobilier': '/mariage%20(4).jpg',             // chaises blanches de cérémonie
  'papeterie': '/mariage%20(1).jpg',            // cérémonie pétales
  'accessoires': '/mariage%20(5).jpg',          // bouquet & arrangements réception
  'tenues-et-accessoires': 'https://images.pexels.com/photos/33996615/pexels-photo-33996615.jpeg?auto=compress&cs=tinysrgb&w=600', // robe de mariée
  'eclairage-et-animation': 'https://images.pexels.com/photos/13434415/pexels-photo-13434415.jpeg?auto=compress&cs=tinysrgb&w=600', // foule en soirée
  'materiel-evenementiel': 'https://images.pexels.com/photos/15865408/pexels-photo-15865408.jpeg?auto=compress&cs=tinysrgb&w=600', // ambiance DJ/musique
};

// Cartes catégorie — style référence : fond crème, photo en arche,
// chip flottante avec le compteur réel d'annonces.
export default function CategoryBentoGrid() {
  const [listings, setListings] = useState<MarketListing[] | null>(null);

  useEffect(() => {
    fetch('/api/market/listings?limit=60')
      .then((r) => r.json())
      .then((json) => setListings(json?.ok ? json.listings : []))
      .catch(() => setListings([]));
  }, []);

  const countFor = (slug: string) =>
    listings?.filter((l) => l.category === slug).length ?? 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {MARKET_CATEGORIES.map((cat) => {
        const count = countFor(cat.slug);
        return (
          <Link
            key={cat.slug}
            href={`/market/annonces?category=${cat.slug}`}
            className="group rounded-[24px] bg-ivory-50 hover:bg-champagne-50 p-4 flex flex-col transition-colors duration-300"
          >
            <div className="flex items-start justify-between mb-4 min-h-[2.6em]">
              <h3 className="font-serif text-charcoal-900 group-hover:text-rose-600 transition-colors leading-[1.3]" style={{ fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)', fontWeight: 400 }}>
                {cat.label}
              </h3>
              <ArrowUpRight className="w-4 h-4 text-charcoal-300 group-hover:text-rose-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
            </div>

            <div className="relative">
              <div className="aspect-[4/5] rounded-t-[999px] rounded-b-2xl overflow-hidden bg-charcoal-100">
                <img
                  src={CATEGORY_IMAGES[cat.slug]}
                  alt={cat.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
              {/* Chip flottante — compteur réel d'annonces */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.68rem] font-semibold shadow-lg ${
                  count > 0 ? 'bg-white/95 text-charcoal-900' : 'bg-white/80 text-charcoal-500'
                }`}>
                  {listings === null
                    ? 'Chargement…'
                    : count > 0
                      ? `${count} annonce${count > 1 ? 's' : ''}`
                      : 'Bientôt disponible'}
                </span>
              </div>
            </div>

            <p className="text-[0.7rem] text-charcoal-400 mt-3 leading-relaxed line-clamp-2">
              {cat.subcategories.map((s) => s.label).join(' · ')}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
