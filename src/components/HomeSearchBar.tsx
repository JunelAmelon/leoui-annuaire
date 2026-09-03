'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown, Store } from 'lucide-react';

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

interface Suggestion { id: string; name: string; category: string; location?: string; imageUrl?: string; }

export default function HomeSearchBar() {
  const router = useRouter();
  const [category, setCategory] = useState('Tous les prestataires');
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [allVendors, setAllVendors] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/public/vendors')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        const vendors = Array.isArray(json.vendors) ? json.vendors : [];
        setAllVendors(vendors.map((v: any) => ({
          id: v.id, name: v.name || '', category: v.category || '',
          location: v.location || '', imageUrl: v.images?.[0] || v.imageUrl || '',
        })));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchCities = (term: string) => {
    if (term.length < 1) { setCitySuggestions([]); setShowCitySuggestions(false); setLoadingCities(false); return; }
    setLoadingCities(true);
    fetch(`/api/public/cities/search?q=${encodeURIComponent(term)}&limit=10`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        const cities = Array.isArray(json.cities) ? json.cities : [];
        setCitySuggestions(cities);
        setShowCitySuggestions(cities.length > 0);
      })
      .catch(() => {
        setCitySuggestions([]);
        setShowCitySuggestions(false);
      })
      .finally(() => setLoadingCities(false));
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (v.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
      const lower = v.toLowerCase();
      const matches = allVendors.filter(s =>
        s.name.toLowerCase().includes(lower) || s.category.toLowerCase().includes(lower)
      ).slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    }, 150);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setCity(v);
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
    if (v.length < 1) { setCitySuggestions([]); setShowCitySuggestions(false); return; }
    cityDebounceRef.current = setTimeout(() => fetchCities(v), 180);
  };

  const handleSearch = (overrideQuery?: string, overrideCity?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : query).trim();
    const c = (overrideCity !== undefined ? overrideCity : city).trim();
    const params = new URLSearchParams();
    if (category !== 'Tous les prestataires') params.set('cat', category);
    if (c) params.set('city', c);
    if (q) params.set('q', q);
    router.push(`/vendors${params.toString() ? '?' + params.toString() : ''}`);
  };

  return (
    <div ref={containerRef} className="flex flex-col sm:flex-row gap-0 shadow-2xl max-w-2xl relative" style={{ backdropFilter: 'blur(12px)' }}>
      {/* Category select */}
      <div className="relative flex-1 bg-white/95">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className="w-4 h-4 text-charcoal-400" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="w-full pl-10 pr-8 py-4 bg-transparent text-charcoal-800 text-sm font-medium focus:outline-none cursor-pointer appearance-none border-0">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px bg-charcoal-200 my-3 flex-shrink-0" />

      {/* Vendor name autocomplete */}
      <div className="relative flex-1 bg-white/95">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <Store className="w-4 h-4 text-charcoal-400" />
        </div>
        <input type="text" value={query} onChange={handleQueryChange}
          onFocus={() => query.length >= 2 && setShowSuggestions(suggestions.length > 0)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Photographe, fleuriste…"
          className="w-full pl-10 pr-4 py-4 bg-transparent text-charcoal-800 text-sm placeholder-charcoal-400 focus:outline-none border-0" />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-charcoal-100 rounded-xl shadow-xl z-50 overflow-hidden">
            {suggestions.map(s => (
              <button key={s.id} onMouseDown={() => { setQuery(s.name); setShowSuggestions(false); handleSearch(s.name, undefined); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex-shrink-0 overflow-hidden">
                  {s.imageUrl ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" /> : <Store className="w-4 h-4 text-charcoal-300 m-auto mt-2" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal-900 truncate">{s.name}</p>
                  <p className="text-xs text-charcoal-400">{s.category}{s.location ? ` · ${s.location.split(',')[0]}` : ''}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px bg-charcoal-200 my-3 flex-shrink-0" />

      {/* City */}
      <div className="relative flex-1 bg-white/95">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <MapPin className="w-4 h-4 text-charcoal-400" />
        </div>
        <input type="text" value={city} onChange={handleCityChange}
          onFocus={() => city.length >= 1 && setShowCitySuggestions(citySuggestions.length > 0)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Ville ou région…"
          className="w-full pl-10 pr-4 py-4 bg-transparent text-charcoal-800 text-sm placeholder-charcoal-400 focus:outline-none border-0" />
        {showCitySuggestions && citySuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-charcoal-100 rounded-xl shadow-xl z-50 overflow-hidden">
            {citySuggestions.map(c => (
              <button key={c} onMouseDown={() => { const cityName = c.split(' (')[0]; setCity(cityName); setShowCitySuggestions(false); handleSearch(undefined, cityName); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-rose-50 transition-colors text-left">
                <MapPin className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                <span className="text-sm text-charcoal-700">{c}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Button */}
      <button onClick={handleSearch}
        className="px-4 sm:px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold tracking-[0.06em] uppercase transition-colors duration-200 flex-shrink-0 flex items-center gap-2 whitespace-nowrap">
        <Search className="w-4 h-4" />
        <span>Trouver</span>
      </button>
    </div>
  );
}
