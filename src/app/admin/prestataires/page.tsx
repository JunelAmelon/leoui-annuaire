'use client';

import { useEffect, useState } from 'react';
import { getDocuments } from '@/lib/db';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import {
  Store, Search, Star, MapPin, ChevronLeft, ChevronRight,
  ExternalLink, CheckCircle, XCircle, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

interface Vendor {
  id: string;
  name: string;
  category: string;
  location?: string;
  rating?: number;
  status?: string;
  weddingsCompleted?: number;
  startingPrice?: string;
  images?: string[];
  updatedAt?: string;
}

const ITEMS_PER_PAGE = 12;

export default function AdminPrestatairesPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Tous');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const docs = await getDocuments('vendors', []);
      setVendors(docs as Vendor[]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, []);
  useEffect(() => setPage(1), [search, filterCat]);

  const categories = ['Tous', ...Array.from(new Set(vendors.map(v => v.category).filter(Boolean))).sort()];

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = !q || (v.name || '').toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q) || (v.location || '').toLowerCase().includes(q);
    const matchCat = filterCat === 'Tous' || v.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleStatus = async (vendor: Vendor) => {
    setUpdatingId(vendor.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const newStatus = vendor.status === 'active' ? 'inactive' : 'active';
      const res = await fetch('/api/admin/vendors-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vendors: [{ ...vendor, status: newStatus }] }),
      });
      if (!res.ok) throw new Error('Erreur');
      setVendors(p => p.map(v => v.id === vendor.id ? { ...v, status: newStatus } : v));
      toast.success(`Statut mis à jour : ${newStatus}`);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-56 bg-white rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-white rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            Prestataires
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{vendors.length} prestataire{vendors.length !== 1 ? 's' : ''} dans la base</p>
        </div>
        <button onClick={fetchVendors} className="flex items-center gap-2 px-4 py-2.5 border border-charcoal-200 text-charcoal-600 text-sm rounded-xl hover:bg-white transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-colors"
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-colors"
        >
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: vendors.length, color: 'text-charcoal-900' },
          { label: 'Actifs', value: vendors.filter(v => v.status !== 'inactive').length, color: 'text-green-700' },
          { label: 'Inactifs', value: vendors.filter(v => v.status === 'inactive').length, color: 'text-red-600' },
          { label: 'Catégories', value: categories.length - 1, color: 'text-rose-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-soft border border-charcoal-100">
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-serif font-light ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Vendor list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-charcoal-100 p-16 text-center">
          <Store className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
          <p className="text-sm text-charcoal-400">Aucun prestataire trouvé</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-charcoal-100 overflow-hidden shadow-soft divide-y divide-charcoal-100">
            {paginated.map((vendor) => {
              const isActive = vendor.status !== 'inactive';
              const cover = vendor.images?.[0];
              return (
                <div key={vendor.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-stone-50 transition-colors group">
                  {/* Cover thumb */}
                  <div className="w-12 h-12 rounded-xl bg-stone-100 flex-shrink-0 overflow-hidden">
                    {cover
                      ? <img src={cover} alt={vendor.name} className="w-full h-full object-cover" />
                      : <Store className="w-5 h-5 text-charcoal-300 m-auto mt-3.5" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-charcoal-900 truncate">{vendor.name}</p>
                      <span className="text-[0.65rem] font-medium px-2 py-0.5 rounded-full bg-champagne-100 text-champagne-700 flex-shrink-0">
                        {vendor.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-charcoal-400">
                      {vendor.location && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{vendor.location}</span>
                      )}
                      {vendor.rating && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{vendor.rating.toFixed(1)}</span>
                      )}
                      {vendor.weddingsCompleted && (
                        <span>{vendor.weddingsCompleted} mariages</span>
                      )}
                    </div>
                  </div>

                  {/* Starting price */}
                  {vendor.startingPrice && (
                    <span className="hidden md:block text-xs text-charcoal-500 flex-shrink-0">
                      à partir de <strong>{vendor.startingPrice}</strong>
                    </span>
                  )}

                  {/* Status toggle */}
                  <button
                    onClick={() => toggleStatus(vendor)}
                    disabled={updatingId === vendor.id}
                    title={isActive ? 'Désactiver' : 'Activer'}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50"
                  >
                    {updatingId === vendor.id
                      ? <RefreshCw className="w-4 h-4 text-charcoal-400 animate-spin" />
                      : isActive
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-red-400" />
                    }
                  </button>

                  {/* View public profile */}
                  <Link href={`/vendors/${vendor.id}`} target="_blank"
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-300 hover:text-rose-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-charcoal-500">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
