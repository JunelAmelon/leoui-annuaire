'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from './PrestataireDashboardLayout';
import {
  Eye, MessageSquare, FileText, Star, TrendingUp,
  ArrowRight, CalendarDays, BadgeCheck, Clock, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { getDocuments } from '@/lib/db';

export default function EspacePrestatairePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ views: 0, messages: 0, devis: 0, rating: 0 });
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const conversations = await getDocuments('conversations', [
          { field: 'vendor_id', operator: '==', value: user.uid },
        ]);
        const devisList = await getDocuments('devis', [
          { field: 'vendor_id', operator: '==', value: user.uid },
        ]);
        setStats({
          views: 142,
          messages: conversations.length,
          devis: devisList.length,
          rating: 4.8,
        });
        setRecentContacts(conversations.slice(0, 4));
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

  return (
    <PrestataireDashboardLayout>
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
                className="group bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-all flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
                  <action.icon className="w-5 h-5 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal-900 group-hover:text-rose-700 transition-colors">{action.label}</p>
                  <p className="text-xs text-charcoal-500 mt-0.5 truncate">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-charcoal-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-champagne-200 flex items-center justify-center text-xs font-bold text-charcoal-700 flex-shrink-0">
                      {(c.client_name || 'C').charAt(0)}
                    </div>
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
