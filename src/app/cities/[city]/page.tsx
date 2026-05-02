'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MapPin, ArrowLeft, Search, SlidersHorizontal, Star, Heart, Crown, Zap, Tag, ChevronRight, ChevronDown } from 'lucide-react';
import { getDocuments } from '@/lib/db';
import VendorSearchAutocomplete from '@/components/VendorSearchAutocomplete';
import { TIER_BADGE } from '@/lib/subscription-plans';
import type { SubscriptionTier } from '@/lib/subscription-plans';

interface CityPageProps {
  params: { city: string };
}

const cityData: Record<string, { name: string; region: string; description: string; imageUrl: string }> = {
  paris: {
    name: 'Paris',
    region: 'Île-de-France',
    description: 'La ville lumière offre un cadre incomparable pour votre mariage. Châteaux, jardins haussmanniens, bords de Seine — chaque lieu raconte une histoire unique.',
    imageUrl: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
  lyon: {
    name: 'Lyon',
    region: 'Auvergne-Rhône-Alpes',
    description: 'Capitale gastronomique de la France, Lyon est idéale pour un mariage alliant élégance et art de vivre. Traboules, vignes et vieille ville classée UNESCO.',
    imageUrl: 'https://images.pexels.com/photos/2901215/pexels-photo-2901215.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
  provence: {
    name: 'Provence',
    region: 'Provence-Alpes-Côte d\'Azur',
    description: 'Lavande, oliviers et lumière dorée : la Provence est le décor de mariage par excellence. Châteaux et domaines viticoles vous attendent pour une célébration inoubliable.',
    imageUrl: 'https://images.pexels.com/photos/208637/pexels-photo-208637.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
  bordeaux: {
    name: 'Bordeaux',
    region: 'Nouvelle-Aquitaine',
    description: 'Entre vignobles et architecture classique, Bordeaux offre un cadre romantique et raffiné pour votre mariage. Domaines viticoles et hôtels particuliers vous accueillent.',
    imageUrl: 'https://images.pexels.com/photos/1974596/pexels-photo-1974596.jpeg?auto=compress&cs=tinysrgb&w=1920',
  },
};

const defaultCity = {
  name: '',
  region: 'France',
  description: 'Découvrez les meilleurs prestataires de mariage dans cette ville.',
  imageUrl: 'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=1920',
};

export default function CityPage({ params }: CityPageProps) {
  const slug = params.city.toLowerCase();
  const city = cityData[slug] ?? { ...defaultCity, name: params.city.charAt(0).toUpperCase() + params.city.slice(1) };

  const [allVendors, setAllVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [sortBy, setSortBy] = useState('recommandés');
  const [cities, setCities] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState('');
  const [hasPromo, setHasPromo] = useState(false);
  const [hasAward, setHasAward] = useState(false);
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 6;

  useEffect(() => {
    Promise.all([
      getDocuments('vendors', []),
      getDocuments('cities', [{ field: 'active', operator: '==', value: true }]),
    ]).then(([docs, cityDocs]) => {
      const cityLower = city.name.toLowerCase();
      const filtered = (docs as any[]).filter(d =>
        (d.location || '').toLowerCase().includes(cityLower)
      ).map(d => ({
        id: d.id,
        name: d.name || '',
        category: d.category || 'Autres',
        location: d.location || '',
        rating: d.rating || 0,
        reviewCount: d.reviewCount || 0,
        imageUrl: d.images?.[0] || d.imageUrl || '',
        startingPrice: d.startingPrice || '',
        featured: d.featured || false,
        subscriptionTier: d.subscriptionTier || 'free',
        hasPromo: d.hasPromo || false,
        hasAward: d.hasAward || false,
        responseTime: d.responseTime || '24h',
        description: d.description || '',
      }));
      setAllVendors(filtered);
      
      const dbCities = (cityDocs as any[]).map((c: any) => c.name).sort();
      if (dbCities.length > 0) setCities(dbCities);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, [city.name]);

  const categories = ['Tous', 'Photographes', 'Traiteurs', 'Fleuristes', 'DJ & Musiciens', 'Décorateurs', 'Vidéastes'];

  const togglePrice = (opt: string) => {
    setPriceFilters(prev => prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]);
  };

  const filteredVendors = allVendors
    .filter(v => {
      const matchCat = selectedCategory === 'Tous' || v.category === selectedCategory;
      const matchSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPromo = !hasPromo || v.hasPromo;
      const matchAward = !hasAward || v.hasAward;
      const matchPrice = priceFilters.length === 0 || priceFilters.some(opt => {
        if (opt === '€') return (parseInt((v.startingPrice || '0').replace(/\D/g, '')) || 0) < 1000;
        if (opt === '€€') { const p = parseInt((v.startingPrice || '0').replace(/\D/g, '')) || 0; return p >= 1000 && p < 3000; }
        if (opt === '€€€') return (parseInt((v.startingPrice || '0').replace(/\D/g, '')) || 0) >= 3000;
        return true;
      });
      return matchCat && matchSearch && matchPromo && matchAward && matchPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'note') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'prix-asc') return (parseInt((a.startingPrice || '0').replace(/\D/g, '')) || 0) - (parseInt((b.startingPrice || '0').replace(/\D/g, '')) || 0);
      if (sortBy === 'prix-desc') return (parseInt((b.startingPrice || '0').replace(/\D/g, '')) || 0) - (parseInt((a.startingPrice || '0').replace(/\D/g, '')) || 0);
      const tierOrder = { premium: 3, standard: 2, free: 1 };
      const tierA = tierOrder[(a.subscriptionTier as keyof typeof tierOrder) || 'free'];
      const tierB = tierOrder[(b.subscriptionTier as keyof typeof tierOrder) || 'free'];
      if (tierA !== tierB) return tierB - tierA;
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / PER_PAGE));
  const pagedVendors = filteredVendors.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <section className="relative overflow-hidden bg-charcoal-900" style={{ minHeight: '380px' }}>
        <div className="absolute inset-0">
          <img
            src={city.imageUrl}
            alt={city.name}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/45" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="max-w-3xl">
          <Link
            href="/cities"
            className="inline-flex items-center gap-2 text-body-sm text-white/60 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Toutes les villes
          </Link>
          <h1 className="font-display text-display-md text-white mb-3">
            Mariage à {city.name}
          </h1>
          <p className="text-body-md text-white/80 mb-7 max-w-lg">
            {city.description}
          </p>
          <p className="text-white/65 text-sm">
            {loading ? '...' : allVendors.length} prestataires disponibles dans cette zone.
          </p>
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
                    : 'bg-white text-charcoal-700 hover:bg-charcoal-100 border border-charcoal-200'
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
                {['€', '€€', '€€€'].map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceFilters.includes(opt)}
                      onChange={() => togglePrice(opt)}
                      className="w-4 h-4 rounded border-charcoal-300 text-rose-600 focus:ring-rose-200"
                    />
                    <span className="text-sm text-charcoal-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            {/* Search bar */}
            <div className="bg-white rounded-xl border border-charcoal-200 p-2 flex gap-2 mb-6">
              <VendorSearchAutocomplete
                placeholder={selectedCategory === 'Tous' ? 'Photographe, traiteur...' : selectedCategory + '...'}
                value={searchQuery}
                onValueChange={v => { setSearchQuery(v); setCurrentPage(1); }}
                className="flex-1"
                inputClassName="flex items-center bg-white rounded-lg"
                showIcon
              />
              <div className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                {cities.length > 0 ? (
                  <select
                    value={cityFilter}
                    onChange={e => { setCityFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-3 py-2.5 bg-white text-charcoal-800 rounded-lg outline-none text-sm focus:bg-white transition-all appearance-none"
                  >
                    <option value="">Toutes les villes</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type="text" value={cityFilter} onChange={e => { setCityFilter(e.target.value); setCurrentPage(1); }}
                    placeholder="Où ?"
                    className="w-full pl-10 pr-3 py-2.5 bg-white text-charcoal-800 placeholder-charcoal-400 rounded-lg outline-none text-sm focus:bg-white transition-all" />
                )}
              </div>
              <button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Rechercher
              </button>
            </div>

            {/* Results header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <p className="text-sm text-charcoal-600">
                  {loading ? (
                    <span className="animate-pulse bg-charcoal-100 rounded w-24 h-5 inline-block" />
                  ) : (
                    <><span className="font-semibold text-charcoal-900">{filteredVendors.length}</span> prestataires à {city.name}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
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

            {/* Vendor list */}
            {!loading && filteredVendors.length === 0 ? (
              <div className="bg-white rounded-2xl border border-charcoal-100 py-20 text-center">
                <p className="text-charcoal-500 font-medium">Aucun prestataire trouvé</p>
                <p className="text-sm text-charcoal-400 mt-1">Modifiez votre recherche ou vos filtres</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(loading ? [1,2,3] : pagedVendors).map((vendor: any, i: number) => (
                  loading ? (
                    <div key={i} className="h-40 bg-charcoal-100 rounded-2xl animate-pulse" />
                  ) : (
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
                                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-rose-500 group-hover:text-white animate-bounce" />
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-display-md text-charcoal-900 mb-6">
            Organiser votre mariage à {city.name}
          </h2>
          <p className="text-body-lg text-charcoal-600 mb-8">
            Nos wedding planners locaux connaissent parfaitement {city.name} et ses environs.
            Laissez-les vous guider vers les meilleures adresses.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/planifier-votre-mariage" className="btn-primary inline-flex items-center space-x-2">
              <span>Contacter un wedding planner</span>
            </Link>
            <Link href="/vendors" className="btn-secondary inline-flex items-center space-x-2">
              <span>Voir tous les prestataires</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
