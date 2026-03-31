'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getDocuments } from '@/lib/db';

const REGIONS = [
  { name: 'Paris',    key: 'paris',     img: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=500',  terms: ['Paris', 'Île-de-France', 'paris'] },
  { name: 'Lyon',     key: 'lyon',      img: 'https://images.pexels.com/photos/2901215/pexels-photo-2901215.jpeg?auto=compress&cs=tinysrgb&w=500', terms: ['Lyon', 'Auvergne', 'Rhône'] },
  { name: 'Provence', key: 'provence',  img: 'https://images.pexels.com/photos/208637/pexels-photo-208637.jpeg?auto=compress&cs=tinysrgb&w=500',  terms: ['Provence', 'Marseille', 'PACA', 'Nice', 'Côte d'] },
  { name: 'Bordeaux', key: 'bordeaux',  img: 'https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=500', terms: ['Bordeaux', 'Gironde', 'Aquitaine', 'Saint-Émilion'] },
];

export default function HomeRegions() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const vendors = await getDocuments('vendors', []);
        const result: Record<string, number> = {};
        for (const region of REGIONS) {
          result[region.key] = vendors.filter((v: any) => {
            const loc: string = (v.location || '').toLowerCase();
            return region.terms.some(t => loc.includes(t.toLowerCase()));
          }).length;
        }
        setCounts(result);
      } catch { /* ignore */ }
      finally { setLoaded(true); }
    })();
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {REGIONS.map((city) => (
        <Link
          key={city.name}
          href={`/cities/${city.key}`}
          className="group block relative overflow-hidden"
          style={{ height: 'clamp(180px, 25vw, 280px)' }}
        >
          <img
            src={city.img}
            alt={city.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/85 via-charcoal-900/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-5">
            <h3 className="font-serif text-white text-xl font-light" style={{ letterSpacing: '-0.005em' }}>
              {city.name}
            </h3>
            <p className="text-white/40 text-[0.65rem] tracking-[0.1em] uppercase font-medium mt-0.5">
              {loaded
                ? counts[city.key] > 0
                  ? `${counts[city.key]} prestataire${counts[city.key] > 1 ? 's' : ''}`
                  : 'Prestataires disponibles'
                : '…'}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
