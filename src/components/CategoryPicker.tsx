'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { VENDOR_CATEGORY_GROUPS } from '@/lib/vendor-categories';
import { X, Search, ChevronDown } from 'lucide-react';

const ICON_BY_GROUP: Record<string, string> = {
  'Lieux de mariage': 'Building2',
  'Traiteur & gourmandises': 'UtensilsCrossed',
  'Papeterie & cadeaux': 'Gift',
  'Photo & vidéo': 'Camera',
  'Musique & son': 'Music',
  'Transport': 'Car',
  'Décoration & fleurs': 'Flower2',
  'Planning & organisation': 'CalendarCheck',
  'Cérémonie': 'BookOpen',
  'Boissons & food': 'Wine',
  'Bijoux & accessoires': 'Gem',
  'Mariée': 'User',
  'Marié': 'UserCheck',
};

interface CategoryPickerProps {
  value?: string;
  onChange: (value: string) => void;
  allLabel?: string;
  placeholder?: string;
  className?: string;
}

export default function CategoryPicker({
  value,
  onChange,
  allLabel = 'Tous les prestataires',
  placeholder = 'Choisir une catégorie',
  className = '',
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (open) { setQuery(''); }
  }, [open]);

  const display = value && value !== allLabel ? value : placeholder;

  const filteredGroups = VENDOR_CATEGORY_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => i.toLowerCase().includes(query.toLowerCase())),
  })).filter(g => g.items.length > 0);

  const handleSelect = (item: string) => {
    onChange(item);
    setOpen(false);
  };

  const handleAll = () => {
    onChange(allLabel);
    setOpen(false);
  };

  const renderIcon = (name: string) => {
    const Icon = (Icons as any)[name];
    if (!Icon) return <div className="w-5 h-5 rounded-full bg-rose-200" />;
    return <Icon className="w-5 h-5 text-rose-600" />;
  };

  if (!mounted) {
    return (
      <button className={`flex items-center gap-2 justify-between px-4 py-3 bg-white rounded-xl border border-charcoal-200 text-left text-sm text-charcoal-800 ${className}`}>
        <span className="truncate">{display}</span>
        <ChevronDown className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`group flex items-center gap-2 justify-between px-4 py-3 bg-white rounded-xl border border-charcoal-200 text-left text-sm text-charcoal-800 hover:border-rose-400 transition-colors ${className}`}
      >
        <span className="truncate font-medium">{display}</span>
        <ChevronDown className="w-4 h-4 text-charcoal-400 group-hover:text-rose-600 flex-shrink-0" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal-100 bg-white">
              <div>
                <h2 className="font-serif text-xl text-charcoal-900">Choisir une catégorie</h2>
                <p className="text-xs text-charcoal-500 mt-0.5">Sélectionnez le prestataire recherché</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-charcoal-100 text-charcoal-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search + all */}
            <div className="px-6 py-4 border-b border-charcoal-100 space-y-3 bg-ivory-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher une catégorie..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400"
                />
              </div>
              <button
                onClick={handleAll}
                className={`inline-flex items-center w-auto px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  value === allLabel || !value ? 'bg-rose-600 text-white' : 'bg-white text-charcoal-700 hover:bg-rose-50 border border-charcoal-200'
                }`}
              >
                {allLabel}
              </button>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto p-6 bg-ivory-50/30">
              {filteredGroups.length === 0 && (
                <p className="text-sm text-charcoal-400 text-center py-12">Aucune catégorie ne correspond.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredGroups.map(group => (
                  <div key={group.label} className="bg-white rounded-2xl p-5 border border-charcoal-100 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                        {renderIcon(ICON_BY_GROUP[group.label] || 'Circle')}
                      </div>
                      <h3 className="font-semibold text-sm text-charcoal-900">{group.label}</h3>
                    </div>
                    <div className="flex flex-col gap-1">
                      {group.items.map(item => (
                        <button
                          key={item}
                          onClick={() => handleSelect(item)}
                          className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            value === item
                              ? 'bg-rose-600 text-white font-medium'
                              : 'text-charcoal-600 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
