'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments } from '@/lib/db';
import {
  Star, MapPin, Camera, ChevronLeft, ChevronRight,
  Heart, List, Grid3X3,
  Tag, CheckCircle2, Users,
} from 'lucide-react';
import VendorSearchAutocomplete from '@/components/VendorSearchAutocomplete';
import VendorCardUnified from '@/components/VendorCardUnified';
import type { SubscriptionTier } from '@/lib/subscription-plans';

interface Vendor {
  id: string;
  uid?: string;
  name: string;
  category: string;
  location?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  images?: string[];
  photo?: string;
  startingPrice?: string;
  description?: string;
  email?: string;
  subscriptionTier?: SubscriptionTier;
  hasPromo?: boolean;
  vendorScore?: number;
}

const CATEGORIES = [
  'Tous', 'Photographes', 'Vidéastes', 'Traiteurs', 'Fleuristes',
  'DJ & Musiciens', 'Décorateurs', 'Wedding Planners', 'Lieux de réception',
];

const PRICE_OPTIONS = ['Moins de 500€', '500€ – 1 000€', '1 000€ – 2 000€', 'Plus de 2 000€'];
const SERVICE_OPTIONS = ['Séance d’engagement', 'Après le mariage', 'Album photo', 'Photos HD', 'Blu-ray / DVD'];
const PER_PAGE = 6;

export default function PrestatairesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { client, loading: dataLoading } = useClientData();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get('cat') || 'Tous');
  const [search, setSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hasPromo, setHasPromo] = useState(false);
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('recommandés');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);

  const togglePrice = (v: string) => setPriceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleService = (v: string) => setServiceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat) setCategory(cat);
  }, [searchParams]);

  // 🔄 Utiliser l'API avec ranking basé sur les formules
  useEffect(() => {
    fetch('/api/public/vendors')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        const docs = Array.isArray(json.vendors) ? json.vendors : [];
        // Les vendors sont déjà triés par vendorScore (formule + note + avis)
        setVendors(docs as Vendor[]);
      })
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, []);

  // Charger les prestataires déjà sélectionnés via collaborations
  useEffect(() => {
    if (!client?.id) return;
    getDocuments('collaborations', [{ field: 'client_id', operator: '==', value: client.id }])
      .then(collabs => {
        const ids = new Set((collabs as any[]).map(c => c.vendor_id).filter(Boolean) as string[]);
        setSelectedVendorIds(ids);
        // Charger le détail de ces vendors
        if (ids.size > 0) {
          getDocuments('vendors', [])
            .then(allVendors => {
              const sel = (allVendors as Vendor[]).filter(v => ids.has(v.id) || ids.has((v as any).uid));
              setSelectedVendors(sel);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [client?.id]);

  const parsePrice = (s: string) => { const n = (s || '').replace(/[^\d]/g, ''); return n ? parseInt(n) : 0; };

  // 🔄 Filtrer les vendors (déjà triés par l'API selon la formule)
  const filtered = vendors
    .filter(v => {
      const matchCat = category === 'Tous' || v.category === category;
      const q = search.toLowerCase();
      const matchSearch = !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
      const matchCity = !citySearch || (v.location || v.address || '').toLowerCase().includes(citySearch.toLowerCase());
      const matchPromo = !hasPromo || v.hasPromo;
      const price = parsePrice(v.startingPrice || '');
      const matchPrice = priceFilters.length === 0 || priceFilters.some(f => {
        if (f === 'Moins de 500€') return price > 0 && price < 500;
        if (f === '500€ – 1 000€') return price >= 500 && price < 1000;
        if (f === '1 000€ – 2 000€') return price >= 1000 && price < 2000;
        if (f === 'Plus de 2 000€') return price >= 2000;
        return true;
      });
      const matchService = serviceFilters.length === 0 ||
        serviceFilters.some(s => (v as any).services?.includes(s) || (v as any).tags?.includes(s));
      const matchSelected = !showSelectedOnly || selectedVendorIds.has(v.id) || selectedVendorIds.has((v as any).uid);
      return matchCat && matchSearch && matchCity && matchPromo && matchPrice && matchService && matchSelected;
    })
    // Tri secondaire selon la sélection utilisateur
    .sort((a, b) => {
      if (sortBy === 'note') return ((b as any).rating || 0) - ((a as any).rating || 0);
      if (sortBy === 'prix-asc') return parsePrice(a.startingPrice || '') - parsePrice(b.startingPrice || '');
      if (sortBy === 'prix-desc') return parsePrice(b.startingPrice || '') - parsePrice(a.startingPrice || '');
      // Par défaut: garder l'ordre de l'API (vendorScore = formule + note + avis)
      return (b.vendorScore || 0) - (a.vendorScore || 0);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openProfile = useCallback((v: Vendor) => {
    router.push(`/espace-client/prestataires/${v.id}`);
  }, [router]);

  if (dataLoading || loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-56 bg-white/60 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/60 rounded-2xl" />)}
      </div>
      <div className="flex gap-5">
        <div className="w-52 flex-shrink-0 hidden lg:block space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-8 bg-white/60 rounded-xl" />)}
        </div>
        <div className="flex-1 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-white/60 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── GREETING + SEARCH ROW ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            {showSelectedOnly ? 'Mes prestataires sélectionnés' : category === 'Tous' ? 'Vos prestataires' : category}
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {filtered.length} prestataire{filtered.length !== 1 ? 's' : ''} {showSelectedOnly ? 'sélectionné' : 'disponible'}{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Search row */}
        <div className="flex items-center gap-2 flex-wrap">
          <VendorSearchAutocomplete
            placeholder="Nom, catégorie…"
            value={search}
            onValueChange={v => { setSearch(v); setPage(1); }}
            className="w-48"
            inputClassName="flex items-center border border-stone-200 rounded-xl bg-white shadow-sm"
          />
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-stone-200 shadow-sm">
            <MapPin className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
            <input type="text" value={citySearch} onChange={e => { setCitySearch(e.target.value); setPage(1); }}
              placeholder="Ville…"
              className="text-sm text-charcoal-700 placeholder-charcoal-400 bg-transparent outline-none w-20" />
          </div>
          <button
            onClick={() => { setShowSelectedOnly(p => !p); setPage(1); }}
            disabled={selectedVendorIds.size === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
              showSelectedOnly
                ? 'bg-charcoal-900 text-white hover:bg-charcoal-800'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            } ${selectedVendorIds.size === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={selectedVendorIds.size === 0 ? 'Aucun prestataire sélectionné' : 'Afficher uniquement mes prestataires sélectionnés'}
          >
            <Users className="w-3.5 h-3.5" />
            {showSelectedOnly ? 'Voir tous' : 'Voir mes prestataires'}
          </button>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Prestataires', value: vendors.length },
          { label: 'Photographes', value: vendors.filter(v => v.category === 'Photographes').length },
          { label: 'Traiteurs', value: vendors.filter(v => v.category === 'Traiteurs').length },
          { label: 'Fleuristes', value: vendors.filter(v => v.category === 'Fleuristes').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-serif text-charcoal-900 leading-none" style={{ fontSize: '1.75rem', fontWeight: 300 }}>{value}</p>
            <p className="text-xs text-charcoal-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              category === cat ? 'bg-charcoal-900 text-white shadow-sm' : 'bg-white text-charcoal-600 hover:bg-stone-100 border border-stone-200'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT — sidebar + results ── */}
      <div className="flex gap-5 items-start">

        {/* LEFT SIDEBAR */}
        <aside className="w-52 flex-shrink-0 hidden lg:block" data-tour="filters">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-5">
            <div>
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">Filtres</p>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-charcoal-700 flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-rose-500" /> Promotions</span>
                <div onClick={() => setHasPromo(p => !p)} className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${hasPromo ? 'bg-charcoal-900' : 'bg-stone-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${hasPromo ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            </div>
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">Prix</p>
              <div className="space-y-2">
                {PRICE_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={priceFilters.includes(opt)} onChange={() => togglePrice(opt)} className="w-3.5 h-3.5 rounded accent-charcoal-900" />
                    <span className="text-sm text-charcoal-600">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">Services</p>
              <div className="space-y-2">
                {SERVICE_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={serviceFilters.includes(opt)} onChange={() => toggleService(opt)} className="w-3.5 h-3.5 rounded accent-charcoal-900" />
                    <span className="text-sm text-charcoal-600">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RESULTS */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-charcoal-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2">
              <div className="flex bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                <button onClick={() => setViewMode('list')} className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-charcoal-900 text-white' : 'text-charcoal-600 hover:bg-stone-100'}`}>
                  <List className="w-3.5 h-3.5" /> Liste
                </button>
                <button onClick={() => setViewMode('grid')} className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-charcoal-900 text-white' : 'text-charcoal-600 hover:bg-stone-100'}`}>
                  <Grid3X3 className="w-3.5 h-3.5" /> Photos
                </button>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-charcoal-700 outline-none shadow-sm">
                <option value="recommandés">Recommandés</option>
                <option value="note">Note (décroissante)</option>
                <option value="prix-asc">Prix (croissant)</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-20 text-center">
              <p className="text-charcoal-500 font-medium">Aucun prestataire trouvé</p>
              <p className="text-sm text-charcoal-400 mt-1">Modifiez votre recherche ou vos filtres</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {paginated.map(vendor => (
                <VendorCardUnified
                  key={vendor.id}
                  id={vendor.id}
                  name={vendor.name}
                  category={vendor.category}
                  location={vendor.location || vendor.address}
                  rating={vendor.rating}
                  reviewCount={vendor.reviewCount}
                  imageUrl={vendor.imageUrl || vendor.images?.[0] || vendor.photo || ''}
                  images={vendor.images}
                  startingPrice={vendor.startingPrice}
                  subscriptionTier={vendor.subscriptionTier}
                  description={vendor.description}
                  hasPromo={vendor.hasPromo}
                  hrefBase="/espace-client/prestataires"
                  variant="horizontal"
                  showFavorite
                  isFavorite={favorites.has(vendor.id)}
                  onFavoriteToggle={(id) => setFavorites(prev => {
                    const n = new Set(prev);
                    n.has(id) ? n.delete(id) : n.add(id);
                    return n;
                  })}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {paginated.map(vendor => (
                <VendorCardUnified
                  key={vendor.id}
                  id={vendor.id}
                  name={vendor.name}
                  category={vendor.category}
                  location={vendor.location || vendor.address}
                  rating={vendor.rating}
                  reviewCount={vendor.reviewCount}
                  imageUrl={vendor.imageUrl || vendor.images?.[0] || vendor.photo || ''}
                  images={vendor.images}
                  startingPrice={vendor.startingPrice}
                  subscriptionTier={vendor.subscriptionTier}
                  description={vendor.description}
                  hrefBase="/espace-client/prestataires"
                  variant="compact"
                  showFavorite
                  isFavorite={favorites.has(vendor.id)}
                  onFavoriteToggle={(id) => setFavorites(prev => {
                    const n = new Set(prev);
                    n.has(id) ? n.delete(id) : n.add(id);
                    return n;
                  })}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl border border-stone-200 text-sm text-charcoal-600 hover:bg-stone-100 disabled:opacity-40 transition-colors shadow-sm">
                <ChevronLeft className="w-3.5 h-3.5" /> Préc.
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                    p === page ? 'bg-charcoal-900 text-white' : 'bg-white border border-stone-200 text-charcoal-700 hover:bg-stone-100'
                  }`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl border border-stone-200 text-sm text-charcoal-600 hover:bg-stone-100 disabled:opacity-40 transition-colors shadow-sm">
                Suiv. <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
