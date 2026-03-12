'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, X, Store } from 'lucide-react';
import { getDocuments } from '@/lib/db';

interface Suggestion {
  id: string;
  name: string;
  category: string;
  location?: string;
  imageUrl?: string;
}

interface Props {
  placeholder?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  navigateOnSelect?: boolean;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
}

let cachedVendors: Suggestion[] | null = null;

async function loadVendors(): Promise<Suggestion[]> {
  if (cachedVendors) return cachedVendors;
  try {
    const docs = await getDocuments('vendors', []);
    cachedVendors = (docs as any[]).map(d => ({
      id: d.id,
      name: d.name || '',
      category: d.category || '',
      location: d.location || '',
      imageUrl: d.images?.[0] || d.imageUrl || '',
    }));
    return cachedVendors;
  } catch { return []; }
}

export default function VendorSearchAutocomplete({
  placeholder = 'Rechercher un prestataire…',
  value = '',
  onValueChange,
  navigateOnSelect = false,
  className = '',
  inputClassName = '',
  showIcon = true,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [allVendors, setAllVendors] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadVendors().then(setAllVendors); }, []);

  useEffect(() => { setQuery(value); }, [value]);

  const getSuggestions = useCallback((q: string) => {
    if (!q.trim() || q.length < 2) { setSuggestions([]); setOpen(false); return; }
    const lower = q.toLowerCase();
    const matches = allVendors
      .filter(v =>
        v.name.toLowerCase().includes(lower) ||
        v.category.toLowerCase().includes(lower) ||
        (v.location || '').toLowerCase().includes(lower)
      )
      .slice(0, 6);
    setSuggestions(matches);
    setOpen(matches.length > 0);
  }, [allVendors]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onValueChange?.(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => getSuggestions(v), 150);
  };

  const handleSelect = (s: Suggestion) => {
    setQuery(s.name);
    onValueChange?.(s.name);
    setOpen(false);
    if (navigateOnSelect) router.push(`/vendors/${s.id}`);
  };

  const handleClear = () => {
    setQuery('');
    onValueChange?.('');
    setSuggestions([]);
    setOpen(false);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className={`flex items-center ${inputClassName || 'border border-charcoal-200 rounded-xl bg-white'}`}>
        {showIcon && <Search className="w-4 h-4 text-charcoal-400 ml-3 flex-shrink-0" />}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { setFocused(true); if (query.length >= 2) getSuggestions(query); }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm text-charcoal-700 placeholder-charcoal-400 bg-transparent outline-none"
        />
        {query && (
          <button onClick={handleClear} className="mr-2 p-1 text-charcoal-300 hover:text-charcoal-600 rounded-full hover:bg-stone-100 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-charcoal-100 rounded-xl shadow-xl z-50 overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.id}
              onMouseDown={() => handleSelect(s)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-stone-100 flex-shrink-0 overflow-hidden">
                {s.imageUrl
                  ? <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                  : <Store className="w-4 h-4 text-charcoal-300 m-auto mt-2.5" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-900 truncate group-hover:text-rose-700">{s.name}</p>
                <div className="flex items-center gap-2 text-xs text-charcoal-400">
                  <span>{s.category}</span>
                  {s.location && <><span>·</span><span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{s.location.split(',')[0]}</span></>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
