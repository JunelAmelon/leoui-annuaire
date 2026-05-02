'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Search, MapPin, Star, Heart, Zap, ChevronDown, Grid3X3, List, Tag, ChevronLeft, ChevronRight, Crown, ArrowRight } from 'lucide-react';
import { TIER_BADGE } from '@/lib/subscription-plans';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import VendorSearchAutocomplete from '@/components/VendorSearchAutocomplete';

const bounceXKeyframes = `
@keyframes bounce-x {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(3px); }
}
`;

const PER_PAGE = 6;

export default function VendorsPage() {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [hasPromo, setHasPromo] = useState(false);
  const [hasAward, setHasAward] = useState(false);
  const [sortBy, setSortBy] = useState('recommandés');
  const [searchQuery, setSearchQuery] = useState('');
  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState('');

  const parsePrice = (priceStr: string): number => {
    const num = (priceStr || '').replace(/[^\d]/g, '');
    return num ? parseInt(num) : 0;
  };

  const togglePrice = (v: string) =>
    setPriceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleService = (v: string) =>
    setServiceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  useEffect(() => {
    fetch('/api/public/vendors')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        const vendors = Array.isArray(json.vendors) ? json.vendors : [];
        const cities = Array.isArray(json.cities) ? json.cities : [];
        setAllVendors(vendors);
        if (cities.length > 0) setCities(cities);
      })
      .catch(() => setAllVendors([]))
      .finally(() => setVendorsLoading(false));
  }, []);

  const categories = ['Tous', 'Photographes', 'Vidéastes', 'Traiteurs', 'Fleuristes', 'DJ & Musiciens', 'Décorateurs', 'Wedding Planners', 'Lieux de réception'];
  const priceOptions = ['Moins de 500€', '500€ - 1 000€', '1 000€ - 1 500€', 'Plus de 1 500€'];
  const serviceOptions = ['Séance d\'engagement', 'Après le mariage', 'Album photo', 'Album digital', 'Photos haute résolution', 'Blu-ray / DVD'];

  const filteredVendors = allVendors
    .filter(v => {
      const matchCategory = selectedCategory === 'Tous' || v.category === selectedCategory;
      const matchPromo = !hasPromo || v.hasPromo;
      const matchAward = !hasAward || (v as any).weddingAward || (v as any).award;
      const matchSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCity = !cityFilter || (v.location || '').toLowerCase().includes(cityFilter.toLowerCase());
      const price = parsePrice(v.startingPrice);
      const matchPrice = priceFilters.length === 0 || priceFilters.some(f => {
        if (f === 'Moins de 500€') return price > 0 && price < 500;
        if (f === '500€ - 1 000€') return price >= 500 && price < 1000;
        if (f === '1 000€ - 1 500€') return price >= 1000 && price < 1500;
        if (f === 'Plus de 1 500€') return price >= 1500;
        return true;
      });
      const matchRating = !ratingFilter || (v.rating || 0) >= ratingFilter;
      const matchService = serviceFilters.length === 0 ||
        serviceFilters.some(s => (v as any).services?.includes(s) || (v as any).tags?.includes(s));
      return matchCategory && matchPromo && matchAward && matchSearch && matchCity && matchPrice && matchRating && matchService;
    })
    .sort((a, b) => {
      if (sortBy === 'note') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'prix-asc') return parsePrice(a.startingPrice) - parsePrice(b.startingPrice);
      if (sortBy === 'prix-desc') return parsePrice(b.startingPrice) - parsePrice(a.startingPrice);
      return (b.vendorScore || 0) - (a.vendorScore || 0);
    });

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / PER_PAGE));
  const pagedVendors = filteredVendors.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="min-h-screen bg-ivory-50">
      <style>{bounceXKeyframes}</style>
      <Header />

      {/* HERO — clean editorial */}
      <section className="relative overflow-hidden bg-charcoal-900" style={{ minHeight: '380px' }}>
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/32291227/pexels-photo-32291227.jpeg"
            alt="Prestataires de mariage"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/45" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-body-sm text-white/60 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90">{selectedCategory === 'Tous' ? 'Tous les prestataires' : selectedCategory}</span>
            </div>
            <h1 className="font-display text-display-md text-white mb-3">
              {selectedCategory === 'Tous' ? 'Prestataires de mariage' : selectedCategory + ' de mariage'}
            </h1>
            <p className="text-body-md text-white/80 mb-7 max-w-lg">
              Choisir le bon prestataire est essentiel pour capturer l'essence de votre union. Explorez notre sélection et trouvez celui qui saura mettre en lumière votre amour unique.
            </p>
            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-2 bg-black/20 rounded-2xl p-2 max-w-lg border border-white/15">
              <VendorSearchAutocomplete
                placeholder={selectedCategory === 'Tous' ? 'Photographe, traiteur...' : selectedCategory + '...'}
                value={searchQuery}
                onValueChange={v => { setSearchQuery(v); setCurrentPage(1); }}
                className="flex-1"
                inputClassName="flex items-center bg-white/10 rounded-xl"
                showIcon
              />
              <div className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                {cities.length > 0 ? (
                  <select
                    value={cityFilter}
                    onChange={e => { setCityFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-3 py-2.5 bg-white/10 text-white rounded-xl outline-none text-sm focus:bg-white/20 transition-all appearance-none"
                  >
                    <option value="" className="text-charcoal-900">Toutes les villes</option>
                    {cities.map(c => <option key={c} value={c} className="text-charcoal-900">{c}</option>)}
                  </select>
                ) : (
                  <input type="text" value={cityFilter} onChange={e => { setCityFilter(e.target.value); setCurrentPage(1); }}
                    placeholder="Où ?"
                    className="w-full pl-10 pr-3 py-2.5 bg-white/10 text-white placeholder-white/40 rounded-xl outline-none text-sm focus:bg-white/20 transition-all" />
                )}
              </div>
              <button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category pills */}
      <div className="bg-white border-b border-charcoal-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-charcoal-900 text-white'
                    : 'bg-charcoal-50 text-charcoal-700 hover:bg-charcoal-100 border border-charcoal-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8 items-start">

          {/* LEFT SIDEBAR */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">
            {/* Filtres spéciaux */}
            <div className="mb-6">
              <button className="flex items-center justify-between w-full text-sm font-semibold text-charcoal-900 mb-3">
                <span>Filtres spéciaux</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-charcoal-700 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-rose-500" /> Promotions
                  </span>
                  <div
                    onClick={() => setHasPromo(p => !p)}
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${hasPromo ? 'bg-rose-600' : 'bg-charcoal-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${hasPromo ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-charcoal-700 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400" /> Gagnants Wedding Awards
                  </span>
                  <div
                    onClick={() => setHasAward(p => !p)}
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${hasAward ? 'bg-rose-600' : 'bg-charcoal-200'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${hasAward ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-charcoal-100 pt-5 mb-5">
              <button className="flex items-center justify-between w-full text-sm font-semibold text-charcoal-900 mb-3">
                <span>Prix</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="space-y-2">
                {priceOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceFilters.includes(opt)}
                      onChange={() => togglePrice(opt)}
                      className="w-4 h-4 rounded border-charcoal-300 text-rose-600 accent-rose-600"
                    />
                    <span className="text-sm text-charcoal-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-charcoal-100 pt-5 mb-5">
              <button className="flex items-center justify-between w-full text-sm font-semibold text-charcoal-900 mb-3">
                <span>Services</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="space-y-2">
                {serviceOptions.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceFilters.includes(opt)}
                      onChange={() => toggleService(opt)}
                      className="w-4 h-4 rounded border-charcoal-300 text-rose-600 accent-rose-600"
                    />
                    <span className="text-sm text-charcoal-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-charcoal-100 pt-5">
              <button className="flex items-center justify-between w-full text-sm font-semibold text-charcoal-900 mb-3">
                <span>Note minimum</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="space-y-2">
                {([{label: '4.5+ étoiles', val: 4.5}, {label: '4.0+ étoiles', val: 4.0}, {label: '3.5+ étoiles', val: 3.5}] as const).map(opt => (
                  <label key={opt.label} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ratingFilter === opt.val}
                      onChange={() => { setRatingFilter(ratingFilter === opt.val ? null : opt.val); setCurrentPage(1); }}
                      className="w-4 h-4 rounded border-charcoal-300 accent-rose-600"
                    />
                    <span className="text-sm text-charcoal-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* MAIN RESULTS */}
          <main className="flex-1 min-w-0">
            {/* Results bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-sm font-semibold text-charcoal-700 uppercase tracking-wide">
                {vendorsLoading ? 'Chargement…' : `${filteredVendors.length.toLocaleString()} résultats`}
              </p>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <div className="flex border border-charcoal-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-charcoal-900 text-white' : 'text-charcoal-600 hover:bg-charcoal-50'}`}
                  >
                    <List className="w-4 h-4" /> Liste
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-charcoal-900 text-white' : 'text-charcoal-600 hover:bg-charcoal-50'}`}
                  >
                    <Grid3X3 className="w-4 h-4" /> Photos
                  </button>
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="border border-charcoal-200 rounded-lg px-3 py-2 text-sm text-charcoal-700 bg-white outline-none focus:ring-2 focus:ring-rose-200"
                >
                  <option value="recommandés">Recommandés</option>
                  <option value="note">Note (décroissante)</option>
                  <option value="prix-asc">Prix (croissant)</option>
                  <option value="prix-desc">Prix (décroissant)</option>
                </select>
              </div>
            </div>

            {!vendorsLoading && filteredVendors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-charcoal-100 py-20 text-center">
                <p className="text-charcoal-500 font-medium">Aucun prestataire trouvé</p>
                <p className="text-sm text-charcoal-400 mt-1">Modifiez votre recherche ou vos filtres</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-4">
                {pagedVendors.map((vendor: any) => (
                  <article key={vendor.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col sm:flex-row border-0 sm:border sm:border-charcoal-100">
                    {/* Image */}
                    <Link href={`/vendors/${vendor.id}`} className="sm:w-48 h-44 sm:h-auto flex-shrink-0 overflow-hidden relative">
                      <img
                        src={vendor.imageUrl}
                        alt={vendor.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      {(() => {
                        const tier = (vendor.subscriptionTier || 'free') as SubscriptionTier;
                        const badge = TIER_BADGE[tier];
                        return badge ? (
                          <span className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1 ${badge.classes}`}>
                            <Crown className="w-2.5 h-2.5" />{badge.label}
                          </span>
                        ) : null;
                      })()}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <Link href={`/vendors/${vendor.id}`}>
                            <h3 className="font-serif text-heading-md text-charcoal-900 hover:text-rose-600 transition-colors">
                              {vendor.name}
                            </h3>
                          </Link>
                          <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors ml-2 flex-shrink-0">
                            <Heart className="w-4 h-4 text-charcoal-400 hover:text-rose-500" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(vendor.rating) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`} />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-charcoal-900">{vendor.rating}</span>
                          <span className="text-sm text-charcoal-500">({vendor.reviewCount})</span>
                          <span className="text-charcoal-300">·</span>
                          <span className="text-sm text-charcoal-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {vendor.location}
                          </span>
                        </div>
                        <p className="text-sm text-charcoal-600 line-clamp-2 leading-relaxed">
                          {vendor.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-charcoal-100 gap-2">
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm text-charcoal-700 flex items-center gap-1.5 font-medium">
                            À partir de <span className="text-charcoal-900 font-semibold">{vendor.startingPrice}</span>
                          </span>
                          {vendor.hasPromo && (
                            <span className="hidden sm:flex text-xs text-rose-600 items-center gap-1">
                              <Tag className="w-3 h-3" /> 1 promotion
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2 flex-shrink-0">
                          <span className="hidden sm:flex text-xs text-charcoal-500 items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" /> Réponse en {vendor.responseTime}
                          </span>
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="group inline-flex items-center justify-center gap-1.5 bg-white border border-rose-200 text-charcoal-700 hover:border-rose-400 hover:bg-rose-50 font-medium px-3 sm:px-4 py-2 rounded-full text-sm transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap flex-shrink-0"
                          >
                            <span className="hidden sm:inline">Voir le profil</span>
                            <span className="sm:hidden text-xs">Voir profil</span>
                            <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-rose-100 rounded-full group-hover:bg-rose-500 transition-colors duration-200 flex-shrink-0">
                              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500 group-hover:text-white animate-[bounce-x_1s_ease-in-out_infinite]" />
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pagedVendors.map((vendor: any) => (
                  <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="group block">
                    <article className="relative h-64 rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300">
                      <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < Math.floor(vendor.rating) ? 'text-amber-400 fill-amber-400' : 'text-white/25'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-white/80 font-medium">{vendor.rating}</span>
                        </div>
                        <p className="text-white font-semibold text-sm truncate">{vendor.name}</p>
                        <p className="text-xs text-white/70 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {vendor.location}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-4 py-2 border border-charcoal-200 rounded-lg text-sm text-charcoal-600 hover:bg-charcoal-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === currentPage ? 'bg-charcoal-900 text-white' : 'border border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-4 py-2 border border-charcoal-200 rounded-lg text-sm text-charcoal-600 hover:bg-charcoal-50 disabled:opacity-40 transition-colors"
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
