'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';

// Barre de recherche marketplace : « Quoi ? » + zone « Où ? » (comme leboncoin).
export default function MarketSearchBar() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (city.trim()) params.set('city', city.trim());
    router.push(`/market/annonces?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col sm:flex-row items-stretch bg-white rounded-2xl sm:rounded-full p-1.5 shadow-soft-xl max-w-2xl"
    >
      <div className="flex items-center flex-[1.4] px-4 border-b sm:border-b-0 sm:border-r border-charcoal-100">
        <Search className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Que cherchez-vous ? Arche, vases, robe…"
          className="w-full bg-transparent px-3 py-2.5 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none"
        />
      </div>
      <CityAutocompleteInput
        value={city}
        onChange={setCity}
        onSelectLocation={(loc: LocationSuggestion) => setCity(loc.name)}
        types="all"
        dropdownPosition="top"
        maxHeight="max-h-56"
        placeholder="Où ? Ville, département…"
        className="flex-1"
        icon
        showPostalCode={false}
        inputClassName="!border-transparent !bg-transparent focus:!ring-0 focus:!border-transparent py-2.5"
      />
      <button
        type="submit"
        className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-2.5 rounded-xl sm:rounded-full text-sm transition-colors flex-shrink-0"
      >
        Rechercher
      </button>
    </form>
  );
}
