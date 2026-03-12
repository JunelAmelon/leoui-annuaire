'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatAssistant from '@/components/ChatAssistant';
import { Search, MapPin, Star, Heart, Zap, ChevronDown, Grid3X3, List, Tag, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDocuments } from '@/lib/db';

const STATIC_VENDORS = [
  { id: 'atelier-lumiere', name: 'Atelier Lumière', category: 'Photographes', location: 'Paris, Île-de-France', rating: 5.0, reviewCount: 127, imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '2 500€', featured: true, hasPromo: true, description: 'Spécialiste du reportage photographique de mariage depuis 12 ans. Approche documentaire et artistique. Chaque image raconte une histoire.', responseTime: '24h' },
  { id: 'maison-florale', name: 'Maison Florale', category: 'Fleuristes', location: 'Lyon, Auvergne-Rhône-Alpes', rating: 4.8, reviewCount: 98, imageUrl: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '1 800€', featured: true, hasPromo: false, description: 'Créations florales de prestige. Bouquets de mariée, décorations de table, arches botaniques d\'exception.', responseTime: '48h' },
  { id: 'saveurs-et-delices', name: 'Saveurs & Délices', category: 'Traiteurs', location: 'Provence, PACA', rating: 5.0, reviewCount: 156, imageUrl: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '85€/pers', featured: false, hasPromo: true, description: 'Cuisine gastronomique française avec produits locaux de saison. Menus personnalisés, service élégant.', responseTime: '24h' },
  { id: 'harmonie-musicale', name: 'Harmonie Musicale', category: 'DJ & Musiciens', location: 'Bordeaux, Nouvelle-Aquitaine', rating: 4.9, reviewCount: 84, imageUrl: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '1 200€', featured: false, hasPromo: false, description: 'DJ et groupe de musiciens pour votre soirée. De la cérémonie au bal de nuit, ambiance parfaite.', responseTime: '12h' },
  { id: 'vision-cine', name: 'Vision Ciné', category: 'Vidéastes', location: 'Paris, Île-de-France', rating: 4.9, reviewCount: 73, imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '3 200€', featured: true, hasPromo: false, description: 'Films de mariage cinématographiques et émotionnels. Montage professionnel, musique originale.', responseTime: '48h' },
  { id: 'elegance-deco', name: 'Élégance Déco', category: 'Décorateurs', location: 'Lyon, Auvergne-Rhône-Alpes', rating: 4.8, reviewCount: 91, imageUrl: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '3 500€', featured: false, hasPromo: true, description: 'Décoration haut de gamme. Tables, arches, luminaires — espaces élégants et personnalisés.', responseTime: '24h' },
  { id: 'le-festin-royal', name: 'Le Festin Royal', category: 'Traiteurs', location: 'Paris, Île-de-France', rating: 4.9, reviewCount: 134, imageUrl: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '95€/pers', featured: true, hasPromo: false, description: 'Traiteur parisien pour mariages de prestige. Gastronomie française, sommelier, service blanc.', responseTime: '24h' },
  { id: 'jardin-enchante', name: 'Le Jardin Enchanté', category: 'Fleuristes', location: 'Provence, PACA', rating: 4.7, reviewCount: 62, imageUrl: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=600', startingPrice: '2 200€', featured: false, hasPromo: false, description: 'Compositions florales bohème et romantiques. Fleurs de saison, couronnes, charme champêtre.', responseTime: '48h' },
];

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
  const [allVendors, setAllVendors] = useState(STATIC_VENDORS);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const togglePrice = (v: string) =>
    setPriceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleService = (v: string) =>
    setServiceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  useEffect(() => {
    getDocuments('vendors', [])
      .then(docs => {
        if (docs.length > 0) {
          setAllVendors(docs.map((d: any) => ({
            id: d.id,
            name: d.name || '',
            category: d.category || 'Autres',
            location: d.location || '',
            rating: d.rating || 0,
            reviewCount: d.reviewCount || 0,
            imageUrl: d.images?.[0] || d.imageUrl || d.photo || '',
            startingPrice: d.startingPrice || '',
            featured: d.featured || false,
            hasPromo: d.hasPromo || false,
            description: d.description || '',
            responseTime: d.responseTime || '48h',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setVendorsLoading(false));
  }, []);

  const categories = ['Tous', 'Photographes', 'Vidéastes', 'Traiteurs', 'Fleuristes', 'DJ & Musiciens', 'Décorateurs', 'Wedding Planners', 'Lieux de réception'];
  const priceOptions = ['Moins de 500€', '500€ - 1 000€', '1 000€ - 1 500€', 'Plus de 1 500€'];
  const serviceOptions = ['Séance d\'engagement', 'Après le mariage', 'Album photo', 'Album digital', 'Photos haute résolution', 'Blu-ray / DVD'];

  const filteredVendors = allVendors.filter(v => {
    const matchCategory = selectedCategory === 'Tous' || v.category === selectedCategory;
    const matchPromo = !hasPromo || v.hasPromo;
    const matchSearch = !searchQuery || v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchPromo && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredVendors.length / PER_PAGE));
  const pagedVendors = filteredVendors.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      {/* HERO — split layout */}
      <section className="relative overflow-hidden bg-charcoal-900" style={{ minHeight: '340px' }}>
        {/* Mobile: full background image */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src="https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=900"
            alt="Prestataires de mariage"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-charcoal-900/65" />
        </div>
        {/* Desktop: right photo */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
          <img
            src="https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="Photographes de mariage"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900 via-charcoal-900/30 to-transparent" />
        </div>
        {/* Left content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14 lg:w-1/2">
          <div className="flex items-center gap-2 text-body-sm text-white/60 mb-4">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-white/90">{selectedCategory === 'Tous' ? 'Tous les prestataires' : selectedCategory}</span>
          </div>
          <h1 className="font-display text-display-md text-white mb-3">
            {selectedCategory === 'Tous' ? 'Prestataires de mariage' : selectedCategory + ' de mariage'}
          </h1>
          <p className="text-body-md text-white/70 mb-7 max-w-lg">
            Choisir le bon prestataire est essentiel pour capturer l'essence de votre union. Explorez notre sélection et trouvez celui qui saura mettre en lumière votre amour unique.
          </p>
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-sm rounded-2xl p-2 max-w-lg border border-white/10">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={selectedCategory === 'Tous' ? 'Photo mariage...' : selectedCategory + '...'}
                className="w-full pl-10 pr-3 py-2.5 bg-white/10 text-white placeholder-white/40 rounded-xl outline-none text-sm focus:bg-white/20 transition-all"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Où ?"
                className="w-full pl-10 pr-3 py-2.5 bg-white/10 text-white placeholder-white/40 rounded-xl outline-none text-sm focus:bg-white/20 transition-all"
              />
            </div>
            <button className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
              Rechercher
            </button>
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
                {['4.5+ étoiles', '4.0+ étoiles', '3.5+ étoiles'].map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-charcoal-300 accent-rose-600" />
                    <span className="text-sm text-charcoal-700">{opt}</span>
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

            {/* LIST VIEW */}
            {viewMode === 'list' && (
              <div className="space-y-4">
                {pagedVendors.map(vendor => (
                  <article key={vendor.id} className="bg-white rounded-2xl border border-charcoal-100 hover:shadow-soft-lg transition-all duration-300 overflow-hidden flex flex-col sm:flex-row">
                    {/* Image */}
                    <Link href={`/vendors/${vendor.id}`} className="sm:w-48 h-44 sm:h-auto flex-shrink-0 overflow-hidden relative">
                      <img
                        src={vendor.imageUrl}
                        alt={vendor.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      {vendor.featured && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-champagne-500 text-white text-xs font-semibold rounded-full">
                          Featured
                        </span>
                      )}
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

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-charcoal-100">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-charcoal-700 flex items-center gap-1.5 font-medium">
                            À partir de <span className="text-charcoal-900 font-semibold">{vendor.startingPrice}</span>
                          </span>
                          {vendor.hasPromo && (
                            <span className="text-xs text-rose-600 flex items-center gap-1">
                              <Tag className="w-3 h-3" /> 1 promotion
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-charcoal-500 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-500" /> Réponse en {vendor.responseTime}
                          </span>
                          <button
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                          >
                            Nous contacter
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {pagedVendors.map(vendor => (
                  <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="group block">
                    <article className="relative h-64 rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-lg transition-all duration-300">
                      <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-0 p-4">
                        <p className="text-xs text-white/70 mb-0.5">{vendor.category}</p>
                        <h3 className="font-serif text-white font-medium">{vendor.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-white/90">{vendor.rating}</span>
                          <span className="text-xs text-white/60">· À partir de {vendor.startingPrice}</span>
                        </div>
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
      <ChatAssistant />
    </div>
  );
}
