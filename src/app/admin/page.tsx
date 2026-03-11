'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getDocuments } from '@/lib/db';
import { Users, MessageSquare, FileText, Calendar, ArrowRight, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface RecentClient {
  id: string;
  name: string;
  partner?: string;
  email: string;
  event_date?: string;
  created_at?: any;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<RecentClient[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingDevis, setPendingDevis] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'planner' && user.role !== 'admin') {
      router.push('/espace-client');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [clientDocs, convDocs, devisDocs] = await Promise.all([
          getDocuments('clients', []),
          getDocuments('conversations', []),
          getDocuments('devis', [{ field: 'status', operator: '==', value: 'sent' }]),
        ]);
        const sorted = (clientDocs as any[]).sort((a, b) => {
          const da = a?.created_at?.toDate?.()?.getTime?.() || 0;
          const db = b?.created_at?.toDate?.()?.getTime?.() || 0;
          return db - da;
        });
        setClients(sorted.slice(0, 5) as RecentClient[]);
        setUnreadMessages((convDocs as any[]).reduce((s, c) => s + (Number(c.unread_count_planner) || 0), 0));
        setPendingDevis(devisDocs.length);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (!authLoading) fetchData();
  }, [authLoading]);

  if (authLoading || loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-champagne-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const STATS = [
    { icon: Users,         label: 'Couples',          value: clients.length,  href: '/admin/clients'  },
    { icon: MessageSquare, label: 'Messages non lus',  value: unreadMessages,  href: '/admin/messages' },
    { icon: FileText,      label: 'Devis en attente',  value: pendingDevis,    href: '/admin/clients'  },
    { icon: TrendingUp,    label: 'Actifs ce mois',    value: clients.length,  href: '/admin/clients'  },
  ];

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Tableau de bord</h1>
      </div>

      {/* Stats — editorial number strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-charcoal-100 border border-charcoal-100">
        {STATS.map(({ icon: Icon, label, value, href }) => (
          <Link key={label} href={href} className="group bg-white p-6 hover:bg-ivory-50 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-3.5 h-3.5 text-charcoal-400 group-hover:text-champagne-600 transition-colors" />
              <p className="label-xs text-charcoal-400 tracking-[0.1em]">{label}</p>
            </div>
            <p
              className="font-serif text-charcoal-900"
              style={{ fontSize: '2.25rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {value}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent clients — magazine list */}
      <div className="bg-white border border-charcoal-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-charcoal-100">
          <h2
            className="font-serif text-charcoal-900"
            style={{ fontSize: '1.25rem', fontWeight: 400, letterSpacing: '-0.005em' }}
          >
            Couples récents
          </h2>
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-2 text-[0.72rem] font-medium tracking-[0.08em] uppercase text-charcoal-400 hover:text-charcoal-900 transition-colors group"
          >
            Voir tout
            <span className="h-px w-5 bg-charcoal-300 group-hover:w-8 transition-all duration-300" />
          </Link>
        </div>

        {clients.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="w-8 h-8 text-charcoal-200 mx-auto mb-3" />
            <p className="text-charcoal-400 text-sm font-light">Aucun couple enregistré.</p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-100">
            {clients.map((client, i) => (
              <Link
                key={client.id}
                href={`/admin/clients/${client.id}`}
                className="group flex items-center gap-5 px-6 py-4 hover:bg-ivory-50 transition-colors"
              >
                {/* Index */}
                <span
                  className="hidden sm:block font-serif text-charcoal-200 w-6 text-right flex-shrink-0"
                  style={{ fontSize: '1.25rem', fontWeight: 300, fontStyle: 'italic', lineHeight: 1 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Avatar initial */}
                <div className="w-9 h-9 border border-charcoal-200 flex items-center justify-center flex-shrink-0 group-hover:border-champagne-400 transition-colors">
                  <span className="font-serif text-charcoal-500 text-sm group-hover:text-champagne-700 transition-colors">
                    {(client.name || 'C').charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-charcoal-900 text-base font-light leading-tight group-hover:text-champagne-800 transition-colors">
                    {client.name}{client.partner ? ` & ${client.partner}` : ''}
                  </p>
                  <p className="text-charcoal-400 text-xs font-light mt-0.5 truncate">{client.email}</p>
                </div>

                {/* Date */}
                {client.event_date && (
                  <div className="hidden md:flex items-center gap-1.5 text-charcoal-400 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs font-light">
                      {new Date(client.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}

                <ArrowRight className="w-3.5 h-3.5 text-charcoal-300 group-hover:text-champagne-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
