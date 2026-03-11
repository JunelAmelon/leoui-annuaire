'use client';

import { useState } from 'react';
import { Search, MapPin, Calendar } from 'lucide-react';

export default function SearchBar() {
  const [searchType, setSearchType] = useState('vendor');

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-soft-xl p-2">
        <div className="flex space-x-2 mb-4 p-2 bg-charcoal-50 rounded-xl">
          <button
            onClick={() => setSearchType('vendor')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-body-sm transition-all duration-200 ${
              searchType === 'vendor'
                ? 'bg-white text-charcoal-900 shadow-soft'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Prestataires
          </button>
          <button
            onClick={() => setSearchType('venue')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-body-sm transition-all duration-200 ${
              searchType === 'venue'
                ? 'bg-white text-charcoal-900 shadow-soft'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Lieux
          </button>
          <button
            onClick={() => setSearchType('inspiration')}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-body-sm transition-all duration-200 ${
              searchType === 'inspiration'
                ? 'bg-white text-charcoal-900 shadow-soft'
                : 'text-charcoal-600 hover:text-charcoal-900'
            }`}
          >
            Inspiration
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-2">
          <div className="md:col-span-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400" />
              <input
                type="text"
                placeholder={
                  searchType === 'vendor'
                    ? 'Photographe, traiteur, DJ...'
                    : searchType === 'venue'
                    ? 'Château, domaine, salle...'
                    : 'Idées, tendances, conseils...'
                }
                className="w-full pl-12 pr-4 py-4 bg-charcoal-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all duration-200 outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400" />
              <input
                type="text"
                placeholder="Paris, Lyon, Provence..."
                className="w-full pl-12 pr-4 py-4 bg-charcoal-50 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all duration-200 outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <button className="w-full btn-primary flex items-center justify-center space-x-2 h-full">
              <Search className="w-5 h-5" />
              <span>Rechercher</span>
            </button>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            <span className="text-body-sm text-charcoal-600">Populaire:</span>
            <button className="text-body-sm text-rose-600 hover:underline">Photographe Paris</button>
            <span className="text-charcoal-300">•</span>
            <button className="text-body-sm text-rose-600 hover:underline">Château Provence</button>
            <span className="text-charcoal-300">•</span>
            <button className="text-body-sm text-rose-600 hover:underline">Traiteur Lyon</button>
          </div>
        </div>
      </div>
    </div>
  );
}
