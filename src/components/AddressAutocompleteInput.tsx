'use client';

/**
 * Autocomplétion d'adresses (Base Adresse Nationale).
 * À la sélection : remplit rue + ville + code postal d'un coup —
 * le champ Ville se remplit tout seul, sans saisie supplémentaire.
 */

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export interface AddressSuggestion {
  label: string;
  street: string;
  city: string;
  postcode: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Appelé quand l'utilisateur clique une suggestion : rue/ville/CP complets. */
  onSelectAddress?: (a: AddressSuggestion) => void;
  placeholder?: string;
  inputClassName?: string;
  className?: string;
  icon?: boolean;
  debounce?: number;
  limit?: number;
}

export default function AddressAutocompleteInput({
  value,
  onChange,
  onSelectAddress,
  placeholder = '12 rue des Lilas',
  inputClassName = '',
  className = '',
  icon = true,
  debounce = 220,
  limit = 8,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
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

  const fetchAddresses = (term: string) => {
    if (term.length < 3) { setSuggestions([]); setShow(false); setLoading(false); return; }
    setLoading(true);
    fetch(`/api/public/addresses/search?q=${encodeURIComponent(term)}&limit=${limit}`)
      .then(async (r) => {
        const json = await r.json();
        const list: AddressSuggestion[] = r.ok && json?.ok ? (json.suggestions || []) : [];
        setSuggestions(list);
        setShow(list.length > 0);
      })
      .catch(() => { setSuggestions([]); setShow(false); })
      .finally(() => setLoading(false));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.length < 3) { setSuggestions([]); setShow(false); return; }
    debounceRef.current = setTimeout(() => fetchAddresses(v), debounce);
  };

  const handleSelect = (item: AddressSuggestion) => {
    onChange(item.street);
    setShow(false);
    onSelectAddress?.(item);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {icon && (
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
      )}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShow(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-charcoal-400" />
      )}
      {show && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-full max-h-72 overflow-y-auto border border-charcoal-100 bg-white shadow-2xl z-[100]">
          {suggestions.map((item) => (
            <button
              key={item.label}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
              className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-rose-50 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-charcoal-400" />
              <span>
                <span className="block text-sm text-charcoal-800">{item.street}</span>
                <span className="block text-[11px] text-charcoal-400">{item.postcode} {item.city}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
