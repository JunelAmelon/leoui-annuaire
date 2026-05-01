'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from './PrestataireDashboardLayout';
import {
  Eye, MessageSquare, FileText, Star, TrendingUp,
  ArrowRight, CalendarDays, BadgeCheck, Clock, ChevronRight, Crown, Zap,
} from 'lucide-react';
import Link from 'next/link';
import { getDocuments, getDocument } from '@/lib/db';
import type { SubscriptionTier } from '@/lib/subscription-plans';

export default function EspacePrestatairePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ views: 0, messages: 0, devis: 0, rating: 0 });
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | null>(null);
  const [clientPhotos, setClientPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [conversations, devisList, vendorDoc, reviewsList] = await Promise.all([
          getDocuments('conversations', [{ field: 'vendor_id', operator: '==', value: user.uid }]),
          getDocuments('devis', [{ field: 'vendor_id', operator: '==', value: user.uid }]),
          getDocument('vendors', user.uid),
          getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: user.uid }]),
        ]);
        const avgRating = reviewsList.length > 0
          ? Math.round(reviewsList.reduce((s: number, r: any) => s + (r.rating || 5), 0) / reviewsList.length * 10) / 10
          : (vendorDoc as any)?.rating || 0;
        setStats({
          views: (vendorDoc as any)?.viewCount || 0,
          messages: conversations.length,
          devis: devisList.length,
          rating: avgRating,
        });
        const recent = conversations.slice(0, 4);
        setRecentContacts(recent);

        try {
          const photos: Record<string, string> = {};
          await Promise.all(recent.map(async (c: any) => {
            if (!c?.client_id) return;
            try {
              const cl = await getDocument('clients', c.client_id);
              const url = (cl as any)?.photoURL || '';
              if (url) photos[c.client_id] = url;
            } catch {}
          }));
          setClientPhotos(photos);
        } catch {}
        const tier = (vendorDoc as any)?.subscriptionTier as SubscriptionTier || 'free';
        const status = (vendorDoc as any)?.subscriptionStatus || 'inactive';
        setSubscriptionTier(status === 'active' ? tier : 'free');
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const statCards = [
    { label: 'Vues annonce', value: stats.views, icon: Eye, color: 'text-champagne-700', bg: 'bg-champagne-50', border: 'border-champagne-200' },
    { label: 'Messages reçus', value: stats.messages, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    { label: 'Devis envoyés', value: stats.devis, icon: FileText, color: 'text-charcoal-600', bg: 'bg-charcoal-50', border: 'border-charcoal-200' },
    { label: 'Note moyenne', value: stats.rating || '—', icon: Star, color: 'text-champagne-700', bg: 'bg-champagne-50', border: 'border-champagne-200', suffix: stats.rating ? '/5' : '' },
  ];

  const quickActions = [
    { href: '/espace-prestataire/mon-annonce', label: 'Modifier mon annonce', icon: BadgeCheck, desc: 'Mettez à jour vos photos et infos' },
    { href: '/espace-prestataire/contacts', label: 'Voir les contacts', icon: MessageSquare, desc: 'Répondez aux demandes de clients' },
    { href: '/espace-prestataire/devis', label: 'Créer un devis', icon: FileText, desc: 'Envoyez une proposition tarifaire' },
    { href: '/espace-prestataire/planning', label: 'Mon planning', icon: CalendarDays, desc: 'Gérez vos disponibilités' },
  ];

  const quickActionBg: Record<string, string> = {
    'Modifier mon annonce': 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'Voir les contacts': 'https://images.pexels.com/photos/7709086/pexels-photo-7709086.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'Créer un devis': 'https://images.pexels.com/photos/6863183/pexels-photo-6863183.jpeg?auto=compress&cs=tinysrgb&w=1600',
    'Mon planning': 'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1600',
  };

  return (
    <PrestataireDashboardLayout>
      {/* Upsell banner — visible si plan free */}
      {!loading && subscriptionTier === 'free' && (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-stone-100 flex-shrink-0">
                <Crown className="w-5 h-5 text-stone-500" />
              </div>
              <div>
                <p className="font-semibold text-charcoal-900 text-sm">Boostez votre visibilité</p>
                <p className="text-charcoal-700 text-xs mt-0.5 leading-relaxed">
                  Les prestataires <strong className="text-charcoal-900">Pro</strong> et <strong className="text-charcoal-900">Elite</strong> apparaissent en tête des résultats et reçoivent 3× plus de contacts.
                </p>
              </div>
            </div>
            <Link
              href="/espace-prestataire/abonnement"
              className="flex items-center gap-2 bg-charcoal-900 hover:bg-charcoal-800 text-blue-200 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap shadow-sm"
            >
              <Zap className="w-4 h-4" /> Voir les tarifs
            </Link>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
          Bonjour{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''} 👋
        </h1>
        <p className="text-sm text-charcoal-500 mt-0.5">Gérez votre annonce et vos contacts depuis cet espace.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="font-serif text-charcoal-900" style={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {loading ? '—' : card.value}{card.suffix}
            </p>
            <p className="text-xs text-charcoal-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-2">
          <h2 className="font-serif text-charcoal-900 text-base font-medium mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group relative rounded-2xl shadow-soft hover:shadow-md transition-all overflow-hidden min-h-[200px] bg-charcoal-900"
              >
                {quickActionBg[action.label] && (
                  <img
                    src={quickActionBg[action.label]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                  />
                )}
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative p-4 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/15 transition-colors">
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white transition-colors">{action.label}</p>
                    <p className="text-xs text-white/70 mt-0.5">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/50 group-hover:text-white transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="font-serif text-charcoal-900 text-base font-medium mb-4">Activité récente</h2>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-12 bg-charcoal-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentContacts.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                <p className="text-sm text-charcoal-500">Aucun contact pour l'instant</p>
                <p className="text-xs text-charcoal-400 mt-1">Les demandes de clients apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y divide-charcoal-50">
                {recentContacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 hover:bg-charcoal-50 transition-colors">
                    {c?.client_id && clientPhotos[c.client_id] ? (
                      <img src={clientPhotos[c.client_id]} alt={c.client_name || 'Client'} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-champagne-200 flex items-center justify-center text-xs font-bold text-charcoal-700 flex-shrink-0">
                        {(c.client_name || 'C').charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal-900 truncate">{c.client_name || 'Client'}</p>
                      <p className="text-xs text-charcoal-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Nouveau message
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-3 border-t border-charcoal-100">
              <Link href="/espace-prestataire/contacts" className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1">
                Voir tous les contacts <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Tip card */}
          <div className="mt-4 bg-gradient-to-br from-champagne-50 to-rose-50 border border-champagne-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-champagne-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal-800">Conseil du jour</p>
                <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
                  Les prestataires avec des photos professionnelles reçoivent <strong>3x plus de contacts</strong>. Ajoutez vos meilleures réalisations.
                </p>
                <Link href="/espace-prestataire/mon-annonce" className="text-xs font-semibold text-rose-600 hover:text-rose-700 mt-2 inline-flex items-center gap-1">
                  Mettre à jour mes photos <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
