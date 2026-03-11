'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  'Tous les prestataires',
  'Photographes',
  'Vidéastes',
  'Traiteurs',
  'Fleuristes',
  'DJ & Musiciens',
  'Décorateurs',
  'Wedding Planners',
  'Lieux de réception',
];

export default function HomeSearchBar() {
  const router = useRouter();
  const [category, setCategory] = useState('Tous les prestataires');
  const [city, setCity] = useState('');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (category !== 'Tous les prestataires') params.set('cat', category);
    if (city.trim()) params.set('ville', city.trim());
    router.push(`/vendors${params.toString() ? '?' + params.toString() : ''}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-0 shadow-2xl max-w-2xl" style={{ backdropFilter: 'blur(12px)' }}>
      {/* Category select */}
      <div className="relative flex-1 bg-white/95">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className="w-4 h-4 text-charcoal-400" />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full pl-10 pr-8 py-4 bg-transparent text-charcoal-800 text-sm font-medium focus:outline-none cursor-pointer appearance-none border-0"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px bg-charcoal-200 my-3 flex-shrink-0" />

      {/* City input */}
      <div className="relative flex-1 bg-white/95">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="w-4 h-4 text-charcoal-400" />
        </div>
        <input
          type="text"
          value={city}
          onChange={e => setCity(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ville ou région…"
          className="w-full pl-10 pr-4 py-4 bg-transparent text-charcoal-800 text-sm placeholder-charcoal-400 focus:outline-none border-0"
        />
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold tracking-[0.06em] uppercase transition-colors duration-200 flex-shrink-0 flex items-center gap-2"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Rechercher</span>
      </button>
    </div>
  );
}
