'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import { VENDOR_CATEGORY_GROUPS } from '@/lib/vendor-categories';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';

export default function HomeSearchBar() {
  const router = useRouter();
  const [category, setCategory] = useState('Tous les prestataires');
  const [city, setCity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSearch = (overrideCity?: string) => {
    const c = (overrideCity !== undefined ? overrideCity : city).trim();
    const params = new URLSearchParams();
    if (category !== 'Tous les prestataires') params.set('cat', category);
    if (c) params.set('city', c);
    if (selectedLocation && selectedLocation.type !== 'city') {
      params.set('locType', selectedLocation.type);
      params.set('locCode', selectedLocation.code);
    }
    router.push(`/vendors${params.toString() ? '?' + params.toString() : ''}`);
  };

  const handleCityChange = (v: string) => {
    setCity(v);
    if (selectedLocation && v !== selectedLocation.name) {
      setSelectedLocation(null);
    }
  };

  const handleCitySelect = (loc: LocationSuggestion) => {
    setCity(loc.name);
    setSelectedLocation(loc);
  };

  return (
    <div ref={containerRef} className="flex flex-col sm:flex-row gap-0 shadow-2xl max-w-2xl relative" style={{ backdropFilter: 'blur(12px)' }}>
      {/* Category select */}
      <div className="relative flex-1 bg-white/95">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Search className="w-4 h-4 text-charcoal-400" />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full h-full pl-10 pr-8 py-4 bg-transparent text-charcoal-800 text-sm font-medium focus:outline-none cursor-pointer appearance-none border-0"
        >
          <option value="Tous les prestataires">Tous les prestataires</option>
          {VENDOR_CATEGORY_GROUPS.map(group => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map(item => <option key={item} value={item}>{item}</option>)}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px bg-charcoal-200 my-3 flex-shrink-0" />

      {/* City / Region */}
      <div className="relative flex-1 bg-white/95">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="w-4 h-4 text-charcoal-400" />
        </div>
        <CityAutocompleteInput
          value={city}
          onChange={handleCityChange}
          onSelectLocation={handleCitySelect}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          dropdownPosition="top"
          types="all"
          placeholder="Ville ou région…"
          className="absolute inset-0"
          inputClassName="h-full pl-10 pr-4 py-4 border-0 rounded-none bg-transparent focus:ring-0"
          icon={false}
          limit={10}
          showPostalCode={false}
        />
      </div>

      {/* Button */}
      <button onClick={() => handleSearch()}
        className="px-4 sm:px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold tracking-[0.06em] uppercase transition-colors duration-200 flex-shrink-0 flex items-center gap-2 whitespace-nowrap">
        <Search className="w-4 h-4" />
        <span>Trouver</span>
      </button>
    </div>
  );
}
