'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { Users, MessageSquare, FileText, Calendar, ArrowRight, Store, Star, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Client { id: string; name: string; partner?: string; email: string; event_date?: string; created_at?: any; }
interface Vendor { id: string; name: string; category: string; location?: string; rating?: number; status?: string; images?: string[]; }

export default function AdminDashboard() {
  const { loading: authLoading } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      try {
        const [clientDocs, vendorDocs, convDocs] = await Promise.all([
          getDocuments('clients', []),
          getDocuments('vendors', []),
          getDocuments('conversations', []),
        ]);
        const sortedClients = (clientDocs as Client[]).sort((a, b) => {
          const da = (a?.created_at as any)?.toDate?.()?.getTime?.() || new Date(a?.created_at || 0).getTime();
          const db2 = (b?.created_at as any)?.toDate?.()?.getTime?.() || new Date(b?.created_at || 0).getTime();
          return db2 - da;
        });
        setClients(sortedClients);
        setVendors(vendorDocs as Vendor[]);
        setUnreadMessages((convDocs as any[]).reduce((s, c) => s + (Number(c.unread_count_planner) || 0), 0));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [authLoading]);

  if (authLoading || loading) return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const STATS = [
    { icon: Users,         label: 'Clients inscrits',    value: clients.length,   href: '/admin/clients',       color: 'text-rose-600' },
    { icon: Store,         label: 'Prestataires',         value: vendors.length,   href: '/admin/prestataires',  color: 'text-champagne-700' },
    { icon: MessageSquare, label: 'Messages non lus',     value: unreadMessages,   href: '/admin/messages',      color: 'text-blue-600' },
  ];

  const quickActions = [
    { href: '/admin/clients', label: 'Gérer les clients', icon: Users, desc: 'Suivi des couples et dossiers' },
    { href: '/admin/prestataires', label: 'Gérer les prestataires', icon: Store, desc: 'Validation et qualité des annonces' },
    { href: '/admin/messages', label: 'Voir les messages', icon: MessageSquare, desc: 'Répondre et suivre les conversations' },
    { href: '/admin/cities', label: 'Gérer les villes', icon: MapPin, desc: 'Activer / désactiver les pages villes' },
    { href: '/admin/articles', label: 'Gérer les articles', icon: FileText, desc: 'Contenu éditorial' },
  ];

  const quickActionBg: Record<string, string> = {
    'Gérer les clients': 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Gérer les prestataires': 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Voir les messages': 'https://images.pexels.com/photos/7709086/pexels-photo-7709086.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Gérer les villes': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1200',
    'Gérer les articles': 'https://images.pexels.com/photos/6863183/pexels-photo-6863183.jpeg?auto=compress&cs=tinysrgb&w=1200',
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Tableau de bord</h1>
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="font-serif text-charcoal-900 text-base font-light mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href} className="group relative rounded-2xl overflow-hidden shadow-soft hover:shadow-md transition-all min-h-[96px]">
              {quickActionBg[a.label] && (
                <img
                  src={quickActionBg[a.label]}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/85 via-charcoal-900/45 to-charcoal-900/20" />
              <div className="relative p-3.5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/15 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white group-hover:text-champagne-200 transition-colors">{a.label}</p>
                  <p className="text-xs text-white/75 mt-0.5 truncate">{a.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(({ icon: Icon, label, value, href, color }) => (
          <Link key={label} href={href}
            className="bg-white rounded-2xl border border-charcoal-100 p-5 shadow-soft hover:border-rose-200 hover:shadow-md transition-all group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-stone-50 rounded-xl flex items-center justify-center group-hover:bg-rose-50 transition-colors">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-xs text-charcoal-400 font-medium leading-tight">{label}</p>
            </div>
            <p className="font-serif text-charcoal-900 text-3xl font-light">{value}</p>
          </Link>
        ))}
      </div>

      {/* Two-col: Clients + Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent clients */}
        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-100">
            <h2 className="font-serif text-charcoal-900 text-base font-light">Derniers clients</h2>
            <Link href="/admin/clients" className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {clients.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-8 h-8 text-charcoal-200 mx-auto mb-2" />
              <p className="text-sm text-charcoal-400">Aucun client inscrit</p>
            </div>
          ) : (
            <div className="divide-y divide-charcoal-50">
              {clients.slice(0, 6).map(client => (
                <Link key={client.id} href={`/admin/clients/${client.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors group">
                  <div className="w-8 h-8 rounded-xl bg-champagne-100 border border-champagne-200 flex items-center justify-center flex-shrink-0">
                    <span className="font-serif text-champagne-700 text-xs font-medium">
                      {(client.name || 'C').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate group-hover:text-rose-700 transition-colors">
                      {client.name}{client.partner ? ` & ${client.partner}` : ''}
                    </p>
                    <p className="text-xs text-charcoal-400 truncate">{client.email}</p>
                  </div>
                  {client.event_date && (
                    <div className="hidden sm:flex items-center gap-1 text-charcoal-400 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">{new Date(client.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent vendors */}
        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-100">
            <h2 className="font-serif text-charcoal-900 text-base font-light">Prestataires</h2>
            <Link href="/admin/prestataires" className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {vendors.length === 0 ? (
            <div className="p-12 text-center">
              <Store className="w-8 h-8 text-charcoal-200 mx-auto mb-2" />
              <p className="text-sm text-charcoal-400">Aucun prestataire</p>
              <Link href="/admin/seed" className="mt-2 inline-block text-xs text-rose-600 hover:text-rose-700 font-medium">
                → Lancer le seed
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-charcoal-50">
              {vendors.slice(0, 6).map(vendor => (
                <div key={vendor.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {vendor.images?.[0]
                      ? <img src={vendor.images[0]} alt={vendor.name} className="w-full h-full object-cover" />
                      : <Store className="w-4 h-4 text-charcoal-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">{vendor.name}</p>
                    <div className="flex items-center gap-2 text-xs text-charcoal-400">
                      <span className="bg-champagne-100 text-champagne-700 px-1.5 py-0.5 rounded-full">{vendor.category}</span>
                      {vendor.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{vendor.location.split(',')[0]}</span>}
                    </div>
                  </div>
                  {vendor.rating && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-charcoal-600 font-medium">{vendor.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <Link href={`/vendors/${vendor.id}`} target="_blank"
                    className="text-charcoal-300 hover:text-rose-600 transition-colors flex-shrink-0">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
