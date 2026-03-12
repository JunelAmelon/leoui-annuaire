'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown, Store } from 'lucide-react';
import { getDocuments } from '@/lib/db';

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
  const [cities, setCities] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      getDocuments('vendors', []),
      getDocuments('cities', [{ field: 'active', operator: '==', value: true }]),
    ]).then(([docs, cityDocs]) => {
      setAllVendors((docs as any[]).map(d => ({
        id: d.id, name: d.name || '', category: d.category || '',
        location: d.location || '', imageUrl: d.images?.[0] || '',
      })));
      const dbCities = (cityDocs as any[]).map((c: any) => c.name).sort();
      if (dbCities.length > 0) setCities(dbCities);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (category !== 'Tous les prestataires') params.set('cat', category);
    if (city.trim()) params.set('ville', city.trim());
    if (query.trim()) params.set('q', query.trim());
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
              <button key={s.id} onMouseDown={() => { router.push(`/vendors/${s.id}`); setShowSuggestions(false); }}
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
        {cities.length > 0 ? (
          <select value={city} onChange={e => setCity(e.target.value)}
            className="w-full pl-10 pr-4 py-4 bg-transparent text-charcoal-800 text-sm placeholder-charcoal-400 focus:outline-none border-0 appearance-none">
            <option value="">Ville ou région…</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input type="text" value={city} onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Ville ou région…"
            className="w-full pl-10 pr-4 py-4 bg-transparent text-charcoal-800 text-sm placeholder-charcoal-400 focus:outline-none border-0" />
        )}
      </div>

      {/* Button */}
      <button onClick={handleSearch}
        className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold tracking-[0.06em] uppercase transition-colors duration-200 flex-shrink-0 flex items-center gap-2">
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Rechercher</span>
      </button>
    </div>
  );
}
