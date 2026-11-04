'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { auth } from '@/lib/firebase';
import {
  Users, MessageSquare, FileText, Calendar,
  Store, Star, MapPin, ShoppingBag, Scale, Package,
  ArrowUpRight, AlertCircle, User,
} from 'lucide-react';
import Link from 'next/link';

interface Client { id: string; name: string; partner?: string; email: string; event_date?: string; created_at?: any; }
interface Vendor { id: string; name: string; category: string; location?: string; rating?: number; status?: string; images?: string[]; }
interface MarketStats {
  listings_active: number; orders_total: number; orders_pending: number;
  disputes_open: number; disputes_total: number; sellers_active: number;
}

export default function AdminDashboard() {
  const { loading: authLoading } = useAuth();
  const [clients, setClients]         = useState<Client[]>([]);
  const [vendors, setVendors]         = useState<Vendor[]>([]);
  const [unread, setUnread]           = useState(0);
  const [loading, setLoading]         = useState(true);
  const [market, setMarket]           = useState<MarketStats | null>(null);
  const [marketLoading, setML]        = useState(true);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const [c, v, m] = await Promise.all([
          getDocuments('clients', []),
          getDocuments('vendors', []),
          getDocuments('conversations', []),
        ]);
        setClients((c as Client[]).sort((a, b) => {
          const ta = (a.created_at as any)?.toDate?.()?.getTime?.() || new Date(a.created_at || 0).getTime();
          const tb = (b.created_at as any)?.toDate?.()?.getTime?.() || new Date(b.created_at || 0).getTime();
          return tb - ta;
        }));
        setVendors(v as Vendor[]);
        setUnread((m as any[]).reduce((s, x) => s + (Number(x.unread_count_planner) || 0), 0));
      } catch { /* non-critique */ }
      finally { setLoading(false); }
    })();
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const r = await fetch('/api/admin/market/stats', { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json() as { ok: boolean; stats?: MarketStats };
        if (d.ok && d.stats) setMarket(d.stats);
      } catch { /* non-critique */ }
      finally { setML(false); }
    })();
  }, [authLoading]);

  if (authLoading || loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Date en français
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-5xl space-y-10">

      {/* ── En-tête ── */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-charcoal-400 uppercase tracking-widest font-medium mb-2">Tableau de bord</p>
          <h1 className="font-serif text-charcoal-950 text-[1.75rem] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
            Vue d'ensemble
          </h1>
        </div>
        <p className="text-xs text-charcoal-400 hidden sm:block capitalize">{today}</p>
      </div>

      {/* ── Bande de chiffres clés ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-charcoal-100 border border-charcoal-100 rounded-2xl bg-white overflow-hidden">
        {[
          { label: 'Couples',       value: clients.length,  href: '/admin/clients' },
          { label: 'Prestataires',  value: vendors.length,  href: '/admin/prestataires' },
          { label: 'Msgs non lus',  value: unread,          href: '/admin/messages',    alert: unread > 0 },
          { label: 'Litiges ouverts', value: market?.disputes_open ?? '—', href: '/admin/litiges', alert: (market?.disputes_open ?? 0) > 0 },
        ].map(s => (
          <Link key={s.label} href={s.href}
            className="group flex flex-col justify-between px-5 py-5 hover:bg-stone-50 transition-colors">
            <p className="text-[11px] text-charcoal-400 font-medium uppercase tracking-wider">{s.label}</p>
            <p className={`font-serif mt-3 text-[2rem] font-light leading-none ${s.alert ? 'text-rose-600' : 'text-charcoal-950'}`}>
              {s.value}
            </p>
            <span className="mt-3 text-[10px] text-charcoal-300 group-hover:text-rose-500 flex items-center gap-0.5 transition-colors">
              Voir <ArrowUpRight className="w-3 h-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* ── Alerte litiges ── */}
      {!marketLoading && (market?.disputes_open ?? 0) > 0 && (
        <div className="flex border border-charcoal-100 rounded-xl bg-white overflow-hidden">
          <div className="w-1 bg-rose-500 flex-shrink-0" />
          <Link href="/admin/litiges"
            className="group flex-1 flex items-center gap-3 px-4 py-3 hover:bg-stone-50/60 transition-colors">
            <Scale className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <p className="text-sm text-charcoal-700 flex-1">
              <span className="font-semibold text-charcoal-900">
                {market!.disputes_open} litige{market!.disputes_open > 1 ? 's' : ''} en attente
              </span>
              <span className="text-charcoal-400"> — arbitrage requis</span>
            </p>
            <span className="text-[11px] font-semibold text-rose-600 group-hover:text-rose-700 transition-colors whitespace-nowrap">
              Traiter →
            </span>
          </Link>
        </div>
      )}

      {/* ── Navigation principale — 2 colonnes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne gauche — accès rapide + Market */}
        <div className="space-y-4">

          {/* Accès rapide — liste propre sans photos */}
          <div className="bg-white border border-charcoal-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-charcoal-100">
              <p className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-widest">Sections</p>
            </div>
            <nav className="divide-y divide-charcoal-50">
              {[
                { href: '/admin/clients',      label: 'Clients',           icon: Users,         meta: `${clients.length}` },
                { href: '/admin/prestataires', label: 'Prestataires',      icon: Store,         meta: `${vendors.length}` },
                { href: '/admin/messages',     label: 'Messages',          icon: MessageSquare, meta: unread > 0 ? `${unread} non lus` : null, alert: unread > 0 },
                { href: '/admin/articles',     label: 'Articles',          icon: FileText,      meta: null },
                { href: '/admin/cities',       label: 'Villes',            icon: MapPin,        meta: null },
                { href: '/admin/litiges',      label: 'Litiges Market',    icon: Scale,         meta: (market?.disputes_open ?? 0) > 0 ? `${market!.disputes_open} ouvert${market!.disputes_open > 1 ? 's' : ''}` : null, alert: (market?.disputes_open ?? 0) > 0 },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors group">
                  <item.icon className="w-4 h-4 text-charcoal-300 group-hover:text-rose-500 transition-colors flex-shrink-0" />
                  <span className="flex-1 text-sm text-charcoal-700 group-hover:text-charcoal-950 transition-colors font-medium">
                    {item.label}
                  </span>
                  {item.meta && (
                    <span className={`text-[11px] font-medium ${item.alert ? 'text-rose-600' : 'text-charcoal-400'}`}>
                      {item.meta}
                    </span>
                  )}
                  <ArrowUpRight className="w-3.5 h-3.5 text-charcoal-200 group-hover:text-rose-400 transition-colors" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Market stats — compact */}
          <div className="bg-white border border-charcoal-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-charcoal-400 uppercase tracking-widest">LeOui Market</p>
              <span className="text-[9px] font-bold uppercase tracking-widest bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Beta</span>
            </div>
            {marketLoading ? (
              <div className="p-5 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex justify-between items-center animate-pulse">
                    <div className="h-3 w-28 bg-charcoal-100 rounded" />
                    <div className="h-3 w-8 bg-charcoal-100 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-charcoal-50">
                {[
                  { label: 'Annonces actives',   icon: Package,     value: market?.listings_active ?? 0 },
                  { label: 'Commandes en cours',  icon: ShoppingBag, value: market?.orders_pending ?? 0 },
                  { label: 'Commandes totales',   icon: ShoppingBag, value: market?.orders_total ?? 0 },
                  { label: 'Vendeurs actifs',     icon: Store,       value: market?.sellers_active ?? 0 },
                  { label: 'Litiges totaux',      icon: Scale,       value: market?.disputes_total ?? 0 },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between px-5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <r.icon className="w-3.5 h-3.5 text-charcoal-300" />
                      <span className="text-sm text-charcoal-600">{r.label}</span>
                    </div>
                    <span className="font-serif text-charcoal-950 text-base font-light">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite — listes récentes */}
        <div className="lg:col-span-2 space-y-4">

          {/* Derniers clients */}
          <div className="bg-white border border-charcoal-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-charcoal-900">Derniers couples inscrits</p>
              <Link href="/admin/clients" className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 transition-colors">
                Tous les clients <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {clients.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-charcoal-400">Aucun couple inscrit</p>
              </div>
            ) : (
              <div>
                {/* En-tête tableau */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2 border-b border-charcoal-50 bg-stone-50/60">
                  <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Couple</span>
                  <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider hidden sm:block">Date mariage</span>
                  <span className="w-4" />
                </div>
                <div className="divide-y divide-charcoal-50">
                  {clients.slice(0, 5).map(client => {
                    const days = client.event_date ? Math.ceil((new Date(client.event_date).getTime() - Date.now()) / 86400000) : null;
                    return (
                      <Link key={client.id} href={`/admin/clients/${client.id}`}
                        className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3 hover:bg-stone-50 transition-colors group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-champagne-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-champagne-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-charcoal-900 truncate group-hover:text-rose-700 transition-colors">
                              {client.name}{client.partner ? ` & ${client.partner}` : ''}
                            </p>
                            <p className="text-[11px] text-charcoal-400 truncate">{client.email}</p>
                          </div>
                        </div>
                        <div className="hidden sm:block text-right">
                          {client.event_date ? (
                            <div>
                              <p className="text-xs text-charcoal-600">
                                {new Date(client.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                              {days !== null && (
                                <p className={`text-[10px] font-medium ${days > 0 ? 'text-champagne-600' : 'text-charcoal-400'}`}>
                                  {days > 0 ? `J−${days}` : days === 0 ? "Aujourd'hui" : `J+${Math.abs(days)}`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-charcoal-300">—</span>
                          )}
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-charcoal-200 group-hover:text-rose-400 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prestataires */}
          <div className="bg-white border border-charcoal-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-charcoal-900">Prestataires</p>
              <Link href="/admin/prestataires" className="text-[11px] text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 transition-colors">
                Gérer <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {vendors.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-charcoal-400">Aucun prestataire</p>
                <Link href="/admin/seed" className="mt-2 inline-block text-xs text-amber-600 hover:text-amber-700 font-medium">
                  Lancer le seed de test →
                </Link>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2 border-b border-charcoal-50 bg-stone-50/60">
                  {['Prestataire', 'Catégorie', 'Note', ''].map((h, i) => (
                    <span key={i} className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                <div className="divide-y divide-charcoal-50">
                  {vendors.slice(0, 5).map(v => (
                    <div key={v.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-stone-50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                          {v.images?.[0]
                            ? <img src={v.images[0]} alt="" className="w-full h-full object-cover" />
                            : <Store className="w-3.5 h-3.5 text-charcoal-300 m-auto mt-1.5" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-charcoal-900 truncate">{v.name}</p>
                          {v.location && (
                            <p className="text-[11px] text-charcoal-400 flex items-center gap-0.5 truncate">
                              <MapPin className="w-2.5 h-2.5" />{v.location.split(',')[0]}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] text-charcoal-500 bg-champagne-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        {v.category}
                      </span>
                      {v.rating ? (
                        <span className="flex items-center gap-1 text-xs text-charcoal-600 font-medium">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{v.rating.toFixed(1)}
                        </span>
                      ) : <span />}
                      <Link href={`/vendors/${v.id}`} target="_blank"
                        className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
