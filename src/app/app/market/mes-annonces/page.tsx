'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { MarketListing } from '@/lib/market/types';
import { formatLocation } from '@/lib/market/utils';
import { Eye, ExternalLink, Loader2, MapPin, Pause, Pencil, Play, Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'all' | 'active' | 'paused' | 'sold';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'En ligne' },
  { id: 'paused', label: 'En pause' },
  { id: 'sold', label: 'Vendues' },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'En ligne', className: 'bg-green-50 text-green-700 border-green-200' },
  paused: { label: 'En pause', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  draft: { label: 'Brouillon', className: 'bg-charcoal-50 text-charcoal-600 border-charcoal-200' },
  reserved: { label: 'Réservée', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  sold: { label: 'Vendue', className: 'bg-charcoal-100 text-charcoal-700 border-charcoal-200' },
  exhausted: { label: 'Épuisée', className: 'bg-charcoal-100 text-charcoal-700 border-charcoal-200' },
  pending_review: { label: 'En modération', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  suspended: { label: 'Suspendue', className: 'bg-red-50 text-red-700 border-red-200' },
};

const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MesAnnoncesPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/listings?mine=1', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setListings((data.listings ?? []).filter((l: MarketListing) => l.status !== 'removed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const filtered = useMemo(() => {
    if (tab === 'all') return listings;
    if (tab === 'sold') return listings.filter((l) => ['sold', 'exhausted', 'reserved'].includes(l.status));
    return listings.filter((l) => l.status === tab);
  }, [listings, tab]);

  const counts = useMemo(
    () => ({
      all: listings.length,
      active: listings.filter((l) => l.status === 'active').length,
      paused: listings.filter((l) => l.status === 'paused').length,
      sold: listings.filter((l) => ['sold', 'exhausted', 'reserved'].includes(l.status)).length,
    }),
    [listings]
  );

  const act = async (l: MarketListing, action: 'pause' | 'activate' | 'delete') => {
    if (busyId) return;
    if (action === 'delete' && !confirm(`Supprimer définitivement « ${l.title} » ?`)) return;
    setBusyId(l.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res =
        action === 'delete'
          ? await fetch(`/api/market/listings/${l.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
          : await fetch(`/api/market/listings/${l.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ status: action === 'pause' ? 'paused' : 'active' }),
            });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur');
      toast.success(action === 'delete' ? 'Annonce supprimée' : action === 'pause' ? 'Annonce mise en pause' : 'Annonce republiée');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Action impossible');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-charcoal-900">Mes annonces</h1>
          <p className="text-sm text-charcoal-500 mt-1">Gérez la visibilité de vos articles en vente.</p>
        </div>
        <Link
          href="/market/deposer-une-annonce"
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouvelle annonce
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
              tab === t.id
                ? 'bg-charcoal-900 text-white border-charcoal-900'
                : 'bg-white text-charcoal-600 border-charcoal-200 hover:border-charcoal-400'
            }`}
          >
            {t.label} <span className={tab === t.id ? 'text-white/60' : 'text-charcoal-400'}>· {counts[t.id]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border border-charcoal-100 p-12 text-center">
          <Tag className="w-10 h-10 text-charcoal-300 mx-auto mb-4" />
          <h2 className="font-serif text-xl text-charcoal-900 mb-2">
            {listings.length === 0 ? 'Vous n’avez pas encore d’annonce' : 'Aucune annonce dans cette catégorie'}
          </h2>
          <p className="text-sm text-charcoal-500 mb-6">
            {listings.length === 0
              ? 'Publiez votre premier article en quelques minutes.'
              : 'Changez de filtre pour voir vos autres annonces.'}
          </p>
          {listings.length === 0 && (
            <Link
              href="/market/deposer-une-annonce"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
            >
              Déposer une annonce
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((l) => {
            const badge = STATUS_BADGE[l.status] ?? { label: l.status, className: 'bg-charcoal-50 text-charcoal-600 border-charcoal-200' };
            const canToggle = l.status === 'active' || l.status === 'paused';
            const engaged = ['sold', 'reserved'].includes(l.status);
            return (
              <li key={l.id} className="rounded-2xl bg-white border border-charcoal-100 p-3 sm:p-4 flex gap-4">
                <Link href={`/market/produit/${l.slug || l.id}`} className="flex-shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-charcoal-100">
                    {l.images?.[0] && <img src={l.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
                </Link>

                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/market/produit/${l.slug || l.id}`}
                      className="font-serif text-base sm:text-lg text-charcoal-900 leading-snug line-clamp-2 hover:text-rose-600 transition-colors"
                    >
                      {l.title}
                    </Link>
                    <span className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-lg font-semibold text-charcoal-900 mt-1">{eur(l.price)} €</p>
                  <p className="flex items-center gap-3 text-xs text-charcoal-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {formatLocation(l.location.city, l.location.postal_code)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {l.views_count || 0} vue{(l.views_count || 0) > 1 ? 's' : ''}
                    </span>
                    <span>Stock : {l.quantity}</span>
                  </p>

                  <div className="flex items-center gap-2 mt-auto pt-3 flex-wrap">
                    <Link
                      href={`/market/produit/${l.slug || l.id}`}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Voir
                    </Link>
                    {!engaged && (
                      <Link
                        href={`/market/modifier-annonce/${l.id}`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Modifier
                      </Link>
                    )}
                    {canToggle && (
                      <button
                        onClick={() => act(l, l.status === 'active' ? 'pause' : 'activate')}
                        disabled={busyId === l.id}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 disabled:opacity-50 transition-colors"
                      >
                        {l.status === 'active' ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Republier</>}
                      </button>
                    )}
                    {!engaged && (
                      <button
                        onClick={() => act(l, 'delete')}
                        disabled={busyId === l.id}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
