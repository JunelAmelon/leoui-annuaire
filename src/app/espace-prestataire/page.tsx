'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from './PrestataireDashboardLayout';
import {
  Eye, MessageSquare, Star,
  ArrowRight, CalendarDays, BadgeCheck, Clock, ChevronRight, Crown, Zap,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { getDocuments, getDocument } from '@/lib/db';
import type { SubscriptionTier } from '@/lib/subscription-plans';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function EspacePrestatairePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ views: 0, messages: 0, rating: 0, appointments: 0 });
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('inactive');
  const [clientPhotos, setClientPhotos] = useState<Record<string, string>>({});
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [conversations, vendorDoc, reviewsList, planningEvents] = await Promise.all([
          getDocuments('conversations', [{ field: 'vendor_id', operator: '==', value: user.uid }]),
          getDocument('vendors', user.uid),
          getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: user.uid }]),
          getDocuments('planning_events', [{ field: 'uid', operator: '==', value: user.uid }]),
        ]);
        const avgRating = reviewsList.length > 0
          ? Math.round(reviewsList.reduce((s: number, r: any) => s + (r.rating || 5), 0) / reviewsList.length * 10) / 10
          : (vendorDoc as any)?.rating || 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingCount = (planningEvents as any[]).filter((t) => {
          const d = t?.date ? new Date(t.date) : null;
          if (!d || isNaN(d.getTime())) return false;
          const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          return eventDay.getTime() >= today.getTime();
        }).length;
        setStats({
          views: (vendorDoc as any)?.viewCount || 0,
          messages: conversations.length,
          rating: avgRating,
          appointments: upcomingCount,
        });
        const recent = (conversations as any[])
          .filter((c) => (c?.unread_count_vendor || c?.unread_vendor || 0) > 0)
          .sort((a: any, b: any) => {
            const ta = a?.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b?.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          })
          .slice(0, 4);
        setRecentContacts(recent);

        try {
          const photos: Record<string, string> = {};
          await Promise.all(recent.map(async (c: any) => {
            if (!c?.client_id) return;
            try {
              const cl = await getDocument('clients', c.client_id);
              const url = (cl as any)?.photoURL || (cl as any)?.photo || (cl as any)?.avatar || (cl as any)?.profilePhoto || '';
              if (url) photos[c.client_id] = url;
            } catch {}
          }));
          setClientPhotos(photos);
        } catch {}
        const tier = (vendorDoc as any)?.subscriptionTier as SubscriptionTier || 'free';
        const status = (vendorDoc as any)?.subscriptionStatus || 'inactive';
        setPhotoCount(((vendorDoc as any)?.images || []).length);
        setSubscriptionTier(status === 'active' ? tier : 'free');
        setSubscriptionStatus(status);
        setStripeCustomerId((vendorDoc as any)?.stripeCustomerId || '');
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'vendors', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const tier = (data?.subscriptionTier as SubscriptionTier) || 'free';
      const status = data?.subscriptionStatus || 'inactive';
      setSubscriptionTier(status === 'active' ? tier : 'free');
      setSubscriptionStatus(status);
      setStripeCustomerId(data?.stripeCustomerId || '');
      setPhotoCount((data?.images || []).length);
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    if (subscriptionTier !== 'free' || !stripeCustomerId) return;
    auth.currentUser?.getIdToken()
      .then((token) => fetch('/api/stripe/reconcile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }))
      .catch(() => null);
  }, [user?.uid, subscriptionTier, stripeCustomerId]);

  const statCards = [
    { label: 'Vues annonce', value: stats.views, icon: Eye, color: 'text-champagne-700', bg: 'bg-champagne-50', border: 'border-champagne-200' },
    { label: 'Messages reçus', value: stats.messages, icon: MessageSquare, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
    { label: 'RDV à venir', value: stats.appointments, icon: CalendarDays, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    { label: 'Note moyenne', value: stats.rating || '—', icon: Star, color: 'text-champagne-700', bg: 'bg-champagne-50', border: 'border-charcoal-200', suffix: stats.rating ? '/5' : '' },
  ];

  const quickActions = [
    { href: '/espace-prestataire/mon-annonce', label: 'Mon profil', icon: BadgeCheck, desc: 'Mettez à jour vos photos et infos' },
    { href: '/espace-prestataire/contacts', label: 'Messages', icon: MessageSquare, desc: 'Répondez aux demandes de clients' },
    { href: '/espace-prestataire/planning', label: 'Mon planning', icon: CalendarDays, desc: 'Gérez vos disponibilités' },
  ];

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
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-blue-200 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap shadow-sm"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-white rounded-2xl border border-stone-100 p-4 flex items-start gap-3 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center flex-shrink-0">
                  <action.icon className="w-5 h-5 text-stone-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal-900">{action.label}</p>
                  <p className="text-xs text-charcoal-500 mt-0.5 leading-relaxed">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-rose-600 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Conseil du jour */}
          {photoCount < 5 && (
            <div className="mt-6 bg-stone-50 border border-stone-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-stone-100 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4 text-stone-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal-800">Conseil du jour</p>
                  <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
                    {photoCount === 0
                      ? 'Ajoutez au moins 5 photos pour donner confiance aux futurs mariés.'
                      : `Vous avez ${photoCount} photo${photoCount > 1 ? 's' : ''}. Ajoutez-en encore ${5 - photoCount} pour maximiser vos contacts.`}
                  </p>
                  <Link href="/espace-prestataire/mon-annonce" className="text-xs text-stone-500 hover:text-rose-600 mt-1.5 inline-flex items-center gap-0.5 underline underline-offset-2">
                    Mettre à jour mes photos
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!loading && subscriptionTier !== 'free' && subscriptionStatus === 'active' && (
            <div className="mt-4 bg-white border border-amber-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <BadgeCheck className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-charcoal-800">Plan {subscriptionTier} actif</p>
                  <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">
                    Votre profil bénéficie d'une meilleure visibilité dans les résultats.
                  </p>
                </div>
              </div>
            </div>
          )}
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
                <p className="text-sm text-charcoal-500">Aucun message non lu</p>
                <p className="text-xs text-charcoal-400 mt-1">Vos nouvelles demandes apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y divide-charcoal-50">
                {recentContacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 hover:bg-charcoal-50 transition-colors">
                    <img
                      src={(c?.client_id && clientPhotos[c.client_id]) || c?.client_photo || 'https://ui-avatars.com/api/?background=F5F5F4&color=57534E&name=Client'}
                      alt={c.client_name || 'Client'}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal-900 truncate">{c.client_name || 'Client'}</p>
                      <p className="text-xs text-charcoal-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Message non lu
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

        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
