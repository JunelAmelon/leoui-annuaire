'use client';

/**
 * Gestion des villes — /admin/cities
 *
 * Les villes stockées dans Firestore pilotent les pages SEO /prestataires/{ville}.
 * Ajout via autocomplete geo.api.gouv.fr (même API que le reste de l'app).
 * Données stockées : name, code_postal, departement, region, code_insee, active.
 */

import { useEffect, useRef, useState } from 'react';
import { getDocuments, setDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import {
  MapPin, Plus, Trash2, Search, ToggleLeft, ToggleRight,
  ChevronLeft, ChevronRight, X, AlertTriangle,
} from 'lucide-react';

interface City {
  id: string;
  name: string;
  code_postal?: string;
  departement?: string;
  region?: string;
  code_insee?: string;
  active: boolean;
  vendor_count?: number;
  created_at?: string;
}

interface GeoSuggestion {
  name: string;
  code: string;
  code_postal?: string;
  departement?: string;
  region?: string;
}

const ITEMS_PER_PAGE = 5;

export default function AdminCitiesPage() {
  const [cities, setCities]           = useState<City[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [vendorCounts, setVendorCounts] = useState<Record<string, number>>({});

  // ── Ajout via autocomplete BAN ──────────────────────────────────────────────
  const [query, setQuery]             = useState('');
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [sugLoading, setSugLoading]   = useState(false);
  const [selected, setSelected]       = useState<GeoSuggestion | null>(null);
  const [adding, setAdding]           = useState(false);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef                   = useRef<HTMLDivElement>(null);

  // ── Confirmation de suppression ─────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<City | null>(null);

  // ── Chargement initial ──────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cityDocs, vendorDocs] = await Promise.all([
        getDocuments('cities', []),
        getDocuments('vendors', []),
      ]);
      // Compter les prestataires par ville (correspondance sur le premier segment)
      const counts: Record<string, number> = {};
      (vendorDocs as any[]).forEach(v => {
        const city = (v.location || '').split(',')[0].trim();
        if (city) counts[city] = (counts[city] || 0) + 1;
      });
      setVendorCounts(counts);
      const sorted = (cityDocs as City[]).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      setCities(sorted);
    } catch { toast.error('Impossible de charger les villes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => setPage(1), [search]);

  // ── Autocomplete geo.api.gouv.fr ────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length < 2) { setSuggestions([]); return; }
    setSugLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,codesPostaux,departement,region,code&limit=8&boost=population`
        );
        const data = await res.json() as any[];
        setSuggestions(
          data.map(c => ({
            name:         c.nom,
            code:         c.code,
            code_postal:  c.codesPostaux?.[0] || '',
            departement:  c.departement?.nom || '',
            region:       c.region?.nom || '',
          }))
        );
      } catch { setSuggestions([]); }
      finally { setSugLoading(false); }
    }, 280);
  }, [query]);

  // Fermer dropdown si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = (s: GeoSuggestion) => {
    setSelected(s);
    setQuery(`${s.name}${s.code_postal ? ` (${s.code_postal})` : ''}`);
    setSuggestions([]);
  };

  const clearSelected = () => { setSelected(null); setQuery(''); };

  const addCity = async () => {
    if (!selected) return;
    setAdding(true);
    try {
      // Vérifier doublon
      if (cities.some(c => c.code_insee === selected.code || c.name.toLowerCase() === selected.name.toLowerCase())) {
        toast.error('Cette ville est déjà dans la liste');
        setAdding(false);
        return;
      }
      const id  = selected.code || selected.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const city: City = {
        id,
        name:        selected.name,
        code_postal: selected.code_postal,
        departement: selected.departement,
        region:      selected.region,
        code_insee:  selected.code,
        active:      true,
        created_at:  new Date().toISOString(),
      };
      await setDocument('cities', id, city);
      setCities(p => [...p, city].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      toast.success(`${city.name} ajoutée`);
      clearSelected();
    } catch { toast.error('Erreur lors de l\'ajout'); }
    finally { setAdding(false); }
  };

  const toggleActive = async (city: City) => {
    const updated = { ...city, active: !city.active };
    try {
      await setDocument('cities', city.id, updated);
      setCities(p => p.map(c => c.id === city.id ? updated : c));
    } catch { toast.error('Erreur'); }
  };

  const removeCity = async (city: City) => {
    try {
      await deleteDocument('cities', city.id);
      setCities(p => p.filter(c => c.id !== city.id));
      toast.success(`${city.name} supprimée`);
      setDeleteConfirm(null);
    } catch { toast.error('Erreur'); }
  };

  // ── Filtrage + pagination ───────────────────────────────────────────────────
  const filtered = cities.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q)
              || (c.departement || '').toLowerCase().includes(q)
              || (c.region || '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const activeCount   = cities.filter(c => c.active).length;
  const coveredCount  = cities.filter(c => (vendorCounts[c.name] || 0) > 0).length;

  if (loading) return (
    <div className="space-y-5 max-w-4xl animate-pulse">
      <div className="h-7 w-48 bg-charcoal-100 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-charcoal-100 rounded-2xl" />)}
      </div>
      <div className="h-96 bg-charcoal-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-7 max-w-4xl">

      {/* ── En-tête ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] text-charcoal-400 uppercase tracking-widest font-medium mb-1.5">Administration</p>
          <h1 className="font-serif text-charcoal-900 text-[1.65rem] font-normal leading-tight" style={{ letterSpacing: '-0.015em' }}>
            Villes couvertes
          </h1>
          <p className="text-sm text-charcoal-500 mt-1">
            {activeCount} active{activeCount !== 1 ? 's' : ''} · {coveredCount} avec prestataires · {cities.length} total
          </p>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: cities.length, sub: 'villes référencées' },
          { label: 'Actives',  value: activeCount,  sub: 'pages SEO actives', accent: true },
          { label: 'Couvertes', value: coveredCount, sub: 'ont ≥1 prestataire' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-charcoal-100 rounded-2xl px-5 py-4 shadow-soft">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-charcoal-400 mb-2">{s.label}</p>
            <p className={`font-serif text-2xl font-light ${s.accent ? 'text-rose-600' : 'text-charcoal-900'}`}>{s.value}</p>
            <p className="text-[11px] text-charcoal-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Ajout via autocomplete ── */}
      <div className="bg-white border border-charcoal-100 rounded-2xl p-5 shadow-soft">
        <p className="text-sm font-semibold text-charcoal-900 mb-1">Ajouter une ville</p>
        <p className="text-xs text-charcoal-400 mb-4">Recherche dans la base officielle des communes françaises (geo.api.gouv.fr)</p>
        <div className="flex gap-3 items-start">
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-charcoal-400 pointer-events-none" />
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setSelected(null); }}
                placeholder="Tapez un nom de commune…"
                className="w-full pl-9 pr-9 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-colors"
              />
              {query && (
                <button onClick={clearSelected} className="absolute right-2.5 text-charcoal-300 hover:text-charcoal-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown suggestions */}
            {(suggestions.length > 0 || sugLoading) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-charcoal-100 rounded-xl shadow-lg z-20 overflow-hidden">
                {sugLoading && (
                  <div className="px-4 py-3 text-xs text-charcoal-400">Recherche…</div>
                )}
                {suggestions.map(s => (
                  <button
                    key={s.code}
                    onClick={() => selectSuggestion(s)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 text-left transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-charcoal-900">{s.name}</span>
                      {s.code_postal && (
                        <span className="text-xs text-charcoal-400 ml-2">{s.code_postal}</span>
                      )}
                      {s.departement && (
                        <span className="text-xs text-charcoal-400 ml-1">· {s.departement}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={addCity}
            disabled={adding || !selected}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            {adding ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>

        {/* Aperçu de la sélection */}
        {selected && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs text-charcoal-700">
            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <span className="font-semibold text-rose-700">{selected.name}</span>
            {selected.code_postal && <span>· {selected.code_postal}</span>}
            {selected.departement && <span>· {selected.departement}</span>}
            {selected.region && <span className="text-charcoal-400">· {selected.region}</span>}
          </div>
        )}
      </div>

      {/* ── Barre de recherche + filtre ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer la liste…"
            className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-colors"
          />
        </div>
        <p className="text-sm text-charcoal-400">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── Liste ── */}
      <div className="bg-white border border-charcoal-100 rounded-2xl shadow-soft overflow-hidden">
        {/* En-tête de tableau */}
        <div className="grid grid-cols-[2fr_1fr_1fr_80px_80px_40px] gap-3 px-5 py-3 border-b border-charcoal-100 bg-stone-50/70">
          {['Commune', 'Dép.', 'Région', 'CP', 'Presta.', ''].map((h, i) => (
            <span key={i} className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MapPin className="w-8 h-8 text-charcoal-200 mx-auto mb-2.5" />
            <p className="text-sm text-charcoal-400">
              {search ? 'Aucune ville correspondante' : 'Aucune ville enregistrée'}
            </p>
            {!search && (
              <p className="text-xs text-charcoal-300 mt-1">Utilisez le champ ci-dessus pour en ajouter</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {paginated.map(city => {
              const count = vendorCounts[city.name] || 0;
              return (
                <div key={city.id} className="grid grid-cols-[2fr_1fr_1fr_80px_80px_40px] items-center gap-3 px-5 py-3 hover:bg-stone-50/60 transition-colors group">
                  {/* Nom */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${city.active ? 'bg-green-400' : 'bg-charcoal-300'}`} />
                    <p className="text-sm font-medium text-charcoal-900 truncate">{city.name}</p>
                    {!city.active && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-charcoal-400 bg-stone-100 px-1.5 py-0.5 rounded-full">off</span>
                    )}
                  </div>
                  {/* Département */}
                  <p className="text-xs text-charcoal-500 truncate">{city.departement || '—'}</p>
                  {/* Région */}
                  <p className="text-xs text-charcoal-400 truncate">{city.region || '—'}</p>
                  {/* Code postal */}
                  <p className="text-xs font-mono text-charcoal-500">{city.code_postal || '—'}</p>
                  {/* Prestataires */}
                  <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                    count > 0 ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-charcoal-400'
                  }`}>
                    {count} presta.
                  </span>
                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => toggleActive(city)}
                      title={city.active ? 'Désactiver' : 'Activer'}
                      className="p-1 text-charcoal-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      {city.active
                        ? <ToggleRight className="w-4 h-4 text-green-500" />
                        : <ToggleLeft className="w-4 h-4 text-charcoal-300" />
                      }
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(city)}
                      className="p-1 text-charcoal-200 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-charcoal-400">
            {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 border border-charcoal-200 rounded-xl disabled:opacity-40 hover:bg-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-charcoal-600 font-medium px-1">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 border border-charcoal-200 rounded-xl disabled:opacity-40 hover:bg-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Modal confirmation suppression ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/50 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-charcoal-900 text-sm">Supprimer {deleteConfirm.name} ?</p>
                <p className="text-xs text-charcoal-500 mt-1">La page SEO de cette ville sera désactivée. Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 text-sm font-medium rounded-xl hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={() => removeCity(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
