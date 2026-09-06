'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface CityAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  dark?: boolean;
  icon?: boolean;
  limit?: number;
  debounce?: number;
  showPostalCode?: boolean;
}

export default function CityAutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Ville ou région…',
  className = '',
  inputClassName = '',
  dark = false,
  icon = true,
  limit = 10,
  debounce = 180,
  showPostalCode = true,
}: CityAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchCities = (term: string) => {
    if (term.length < 1) { setSuggestions([]); setShow(false); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/public/cities/search?q=${encodeURIComponent(term)}&limit=${limit}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        const cities = Array.isArray(json.cities) ? json.cities : [];
        setSuggestions(cities);
        setShow(cities.length > 0);
      })
      .catch(() => {
        setSuggestions([]);
        setShow(false);
      })
      .finally(() => setLoading(false));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length < 1) { setSuggestions([]); setShow(false); return; }
    debounceRef.current = setTimeout(() => fetchCities(v), debounce);
  };

  const handleSelect = (suggestion: string) => {
    const cityName = showPostalCode ? suggestion.split(' (')[0] : suggestion;
    onChange(cityName);
    setShow(false);
    onSelect?.(cityName);
  };

  const baseInput = dark
    ? 'w-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:bg-white/20'
    : 'w-full bg-white border border-charcoal-200 text-charcoal-800 placeholder-charcoal-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {icon && (
        <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${dark ? 'text-white/50' : 'text-charcoal-400'}`} />
      )}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => value.length >= 1 && suggestions.length > 0 && setShow(true)}
        placeholder={placeholder}
        className={`${baseInput} ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-xl outline-none text-sm transition-all ${inputClassName}`}
      />
      {loading && (
        <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${dark ? 'text-white/60' : 'text-charcoal-400'}`} />
      )}
      {show && suggestions.length > 0 && (
        <div className={`absolute top-full left-0 right-0 mt-1 border rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto ${dark ? 'bg-rose-600 border-white/10' : 'bg-white border-charcoal-100'}`}>
          {suggestions.map((c) => (
            <button
              key={c}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors ${dark ? 'hover:bg-white/10 text-white' : 'hover:bg-rose-50 text-charcoal-700'}`}
            >
              <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${dark ? 'text-white/50' : 'text-charcoal-400'}`} />
              <span className="text-sm">{showPostalCode ? c : c.split(' (')[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
