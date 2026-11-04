'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ListingCard from '@/components/market/ListingCard';
import MarketSearchBar from '@/components/market/MarketSearchBar';
import TitleDecoration from '@/components/market/TitleDecoration';
import { MARKET_CATEGORIES, CONDITION_LABELS } from '@/lib/market/categories';
import { MarketListing } from '@/lib/market/types';
import { Search, MapPin, SlidersHorizontal, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';

const PER_PAGE = 24;

function CatalogueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const condition = searchParams.get('condition') || '';
  const q = searchParams.get('q') || '';
  const city = searchParams.get('city') || '';
  const sort = searchParams.get('sort') || 'recent';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  const [searchInput, setSearchInput] = useState(q);
  const [cityInput, setCityInput] = useState(city);
  const [minInput, setMinInput] = useState(minPrice);
  const [maxInput, setMaxInput] = useState(maxPrice);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== 'offset') params.delete('offset');
      router.push(`/market/annonces?${params.toString()}`);
    },
    [searchParams, router]
  );

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('limit', String(PER_PAGE));
      const res = await fetch(`/api/market/listings?${params.toString()}`);
      const json = await res.json();
      setListings(res.ok && json.ok ? json.listings : []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    setSearchInput(q);
    setCityInput(city);
    setMinInput(minPrice);
    setMaxInput(maxPrice);
  }, [q, city, minPrice, maxPrice]);

  const hasFilters = category || condition || q || city || minPrice || maxPrice;
  const resetFilters = () => router.push('/market/annonces');

  const filtersPanel = (
    <div className="space-y-6">
      {/* 1. Prix en premier */}
      <div>
        <h4 className="text-sm font-semibold text-charcoal-900 mb-3">Prix (€)</h4>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={() => setParam('minPrice', minInput)}
            className="w-full px-3 py-2 border border-charcoal-200 rounded-lg text-sm focus:outline-none focus:border-rose-400"
          />
          <span className="text-charcoal-400">–</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={() => setParam('maxPrice', maxInput)}
            className="w-full px-3 py-2 border border-charcoal-200 rounded-lg text-sm focus:outline-none focus:border-rose-400"
          />
        </div>
      </div>

      {/* 2. Catégorie */}
      <div className="border-t border-charcoal-100 pt-5">
        <h4 className="text-sm font-semibold text-charcoal-900 mb-3">Catégorie</h4>
        <div className="space-y-1">
          <button
            onClick={() => setParam('category', '')}
            className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
              !category ? 'bg-rose-600 text-white' : 'text-charcoal-600 hover:bg-rose-50'
            }`}
          >
            Toutes
          </button>
          {MARKET_CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setParam('category', c.slug)}
              className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                category === c.slug ? 'bg-rose-600 text-white' : 'text-charcoal-600 hover:bg-rose-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. État */}
      <div className="border-t border-charcoal-100 pt-5">
        <h4 className="text-sm font-semibold text-charcoal-900 mb-3">État</h4>
        <div className="space-y-1">
          <button
            onClick={() => setParam('condition', '')}
            className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
              !condition ? 'bg-rose-600 text-white' : 'text-charcoal-600 hover:bg-rose-50'
            }`}
          >
            Tous
          </button>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setParam('condition', value)}
              className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                condition === value ? 'bg-rose-600 text-white' : 'text-charcoal-600 hover:bg-rose-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={resetFilters}
          className="w-full text-center text-sm text-rose-600 hover:text-rose-700 font-medium"
        >
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero compact — photo de fond & dégradé bordeaux / rose élégant */}
      <section className="relative overflow-hidden bg-charcoal-900">
        <img
          src="/mariage%20(4).jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#5B1A2E]/95 via-[#5B1A2E]/75 sm:via-[#5B1A2E]/60 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center gap-2 text-body-sm text-white/60 mb-3">
            <Link href="/market" className="hover:text-white transition-colors">LeOui Market</Link>
            <span>/</span>
            <span className="text-white/90">Annonces</span>
          </div>

          <div className="relative mb-3 max-w-2xl">
            <h1
              className="font-serif text-white"
              style={{ fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.02em' }}
            >
              Achetez et revendez<br />
              votre décoration de{' '}
              <span className="relative inline-block">
                mariage
                <TitleDecoration />
              </span>
            </h1>
          </div>

          <p className="text-white/85 mb-7 max-w-xl text-sm sm:text-base leading-relaxed font-light">
            Le marketplace spécialisé pour donner une seconde vie aux plus belles décorations de mariage.
          </p>

          {/* Search bar identique à la page market */}
          <MarketSearchBar />
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8 items-start">
          {/* Sidebar desktop */}
          <aside className="w-56 flex-shrink-0 hidden lg:block">{filtersPanel}</aside>

          {/* Results */}
          <main className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-sm font-semibold text-charcoal-700 uppercase tracking-wide">
                {loading ? 'Chargement…' : `${listings.length} annonce${listings.length > 1 ? 's' : ''}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFilters(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-2 border border-charcoal-200 rounded-lg text-sm text-charcoal-700"
                >
                  <SlidersHorizontal className="w-4 h-4" /> Filtres
                </button>
                <select
                  value={sort}
                  onChange={(e) => setParam('sort', e.target.value)}
                  className="border border-charcoal-200 rounded-lg px-3 py-2 text-sm text-charcoal-700 bg-white outline-none focus:ring-2 focus:ring-rose-200"
                >
                  <option value="recent">Plus récentes</option>
                  <option value="relevance">Pertinence</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                </select>
                <Link
                  href="/market/deposer-une-annonce"
                  className="hidden sm:flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Déposer une annonce
                </Link>
              </div>
            </div>

            {!loading && listings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-charcoal-100 py-20 text-center">
                <p className="text-charcoal-500 font-medium">Aucune annonce trouvée</p>
                <p className="text-sm text-charcoal-400 mt-1">
                  {hasFilters ? 'Essayez d\'élargir vos critères de recherche' : 'Soyez le premier à publier un article'}
                </p>
                <Link
                  href="/market/deposer-une-annonce"
                  className="inline-flex items-center gap-1.5 mt-5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" /> Déposer une annonce
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && listings.length > 0 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  disabled={offset === 0}
                  onClick={() => setParam('offset', String(Math.max(offset - PER_PAGE, 0)))}
                  className="flex items-center gap-1 px-4 py-2 border border-charcoal-200 rounded-lg text-sm text-charcoal-700 disabled:opacity-40 hover:bg-charcoal-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
                <span className="text-sm text-charcoal-500">
                  Page {Math.floor(offset / PER_PAGE) + 1}
                </span>
                <button
                  disabled={listings.length < PER_PAGE}
                  onClick={() => setParam('offset', String(offset + PER_PAGE))}
                  className="flex items-center gap-1 px-4 py-2 border border-charcoal-200 rounded-lg text-sm text-charcoal-700 disabled:opacity-40 hover:bg-charcoal-50 transition-colors"
                >
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Drawer filtres mobile */}
      {mobileFilters && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-charcoal-900/40" onClick={() => setMobileFilters(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto shadow-soft-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-charcoal-900">Filtres</h3>
              <button onClick={() => setMobileFilters(false)} className="p-1 text-charcoal-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            {filtersPanel}
          </aside>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function MarketAnnoncesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="py-32 text-center text-charcoal-400">Chargement…</div>
          <Footer />
        </div>
      }
    >
      <CatalogueContent />
    </Suspense>
  );
}
