'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export interface LocationSuggestion {
  type: 'city' | 'department' | 'region';
  name: string;
  label: string;
  code: string;
}

interface CityAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  onSelectLocation?: (loc: LocationSuggestion) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  types?: string;
  dropdownPosition?: 'top' | 'bottom';
  maxHeight?: string;
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
  onSelectLocation,
  onKeyDown,
  types = 'city',
  dropdownPosition = 'bottom',
  maxHeight = 'max-h-72',
  placeholder = 'Ville ou région…',
  className = '',
  inputClassName = '',
  dark = false,
  icon = true,
  limit = 10,
  debounce = 180,
  showPostalCode = true,
}: CityAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
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
    fetch(`/api/public/cities/search?q=${encodeURIComponent(term)}&types=${encodeURIComponent(types)}&limit=${limit}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        if (Array.isArray(json.suggestions)) {
          setSuggestions(json.suggestions);
        } else {
          const legacy = Array.isArray(json.cities) ? json.cities : [];
          setSuggestions(legacy.map((c: string) => {
            const name = c.split(' (')[0];
            return { type: 'city', name, label: c, code: '' };
          }));
        }
        setShow(suggestions.length > 0);
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

  const handleSelect = (item: LocationSuggestion) => {
    onChange(item.name);
    setShow(false);
    onSelect?.(item.name);
    onSelectLocation?.(item);
  };

  const baseInput = dark
    ? 'w-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:bg-white/20'
    : 'w-full bg-white border border-charcoal-200 text-charcoal-800 placeholder-charcoal-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100';

  const dropdownPosClasses = dropdownPosition === 'top'
    ? 'bottom-full mb-1'
    : 'top-full mt-1';

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
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`${baseInput} ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-xl outline-none text-sm transition-all ${inputClassName}`}
      />
      {loading && (
        <Loader2 className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${dark ? 'text-white/60' : 'text-charcoal-400'}`} />
      )}
      {show && suggestions.length > 0 && (
        <div className={`absolute ${dropdownPosClasses} left-0 min-w-full w-max max-w-[90vw] sm:max-w-md ${maxHeight} overflow-y-auto border rounded-xl shadow-2xl z-[100] overflow-x-hidden ${dark ? 'bg-rose-600 border-white/10' : 'bg-white border-charcoal-100'}`}>
          {suggestions.map((item) => (
            <button
              key={`${item.type}-${item.code || item.label}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${dark ? 'hover:bg-white/10 text-white' : 'hover:bg-rose-50 text-charcoal-700'}`}
            >
              <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${dark ? 'text-white/50' : 'text-charcoal-400'}`} />
              <span className="text-sm">{showPostalCode ? item.label : item.name}</span>
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ml-auto flex-shrink-0 ${dark ? 'bg-white/20 text-white/80' : 'bg-charcoal-100 text-charcoal-500'}`}>
                {item.type === 'city' ? 'Ville' : item.type === 'department' ? 'Dépt' : 'Région'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
