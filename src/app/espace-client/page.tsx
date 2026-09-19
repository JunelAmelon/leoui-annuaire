'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments } from '@/lib/db';
import { getClientVendors } from '@/lib/client-helpers';
import {
  Search, Plus, Heart, Calendar, MapPin, ChevronRight,
  ArrowRight, ArrowUpRight, CheckSquare, Users,
} from 'lucide-react';
import Link from 'next/link';

/* ── Semi-circle gauge (like "Steps for Today" in reference) ── */
function GaugeChart({ value, max, color = '#E11D48' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 38;
  const cx = 50;
  const cy = 50;
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg viewBox="0 0 100 58" className="w-full">
      <path d={bgPath} fill="none" stroke="#E8E4DF" strokeWidth="9" strokeLinecap="round" />
      <path d={bgPath} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        pathLength="1" strokeDasharray={`${pct} 1`} />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#2D2A26"
        style={{ fontSize: '18px', fontFamily: 'Cormorant Garamond, serif', fontWeight: 300 }}>{value}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#9B9189" style={{ fontSize: '7.5px' }}>/ {max}</text>
    </svg>
  );
}


export default function EspaceClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { client, event, loading } = useClientData();
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0 });
  const [guestStats, setGuestStats] = useState({ total: 0, confirmed: 0 });
  const [teamVendors, setTeamVendors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const id = event?.id || client?.id;
    if (!id || loading) return;
    const field = event?.id ? 'event_id' : 'client_id';
    getDocuments('tasks', [{ field, operator: '==', value: id }])
      .then(items => {
        const all = items as any[];
        const milestones = all.filter(t => t.kind === 'milestone');
        setTaskStats({ total: milestones.length, done: milestones.filter(t => t.client_confirmed).length });
      }).catch(() => {});
    getDocuments('guests', [{ field, operator: '==', value: id }])
      .then(items => {
        const all = items as any[];
        setGuestStats({ total: all.length, confirmed: all.filter(g => g.rsvp === 'confirmed').length });
      }).catch(() => {});
    if (client?.id) {
      getClientVendors(client.id, event?.id)
        .then(vs => setTeamVendors(vs.slice(0, 4)))
        .catch(() => {});
    }
  }, [event?.id, client?.id, loading]);

  const firstName = client?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'vous';
  const coupleName = client
    ? `${client.name || ''}${client.name && client.partner ? ' & ' : ''}${client.partner || ''}`.trim()
    : user?.displayName || 'Mon mariage';

  const eventDate = event?.event_date || (client as any)?.event_date || '';
  const daysLeft = eventDate
    ? Math.max(0, Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000))
    : null;
  const budget = event?.budget || (client as any)?.budget || 0;
  const totalGuests = event?.guest_count || (client as any)?.guest_count || 0;
  const venue = event?.venue || (client as any)?.venue || 'Aucun lieu choisi';
  const checkPct = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;
  const fmtDate = eventDate
    ? new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date à définir';

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-48 bg-white/60 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 h-56 bg-white/60 rounded-2xl" />
        <div className="lg:col-span-2 h-56 bg-white/40 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-48 bg-white/60 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── GREETING ROW ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            Bonjour, {firstName} !
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">Votre grand jour approche{daysLeft !== null ? <> — <span className="font-semibold text-champagne-600">J-{daysLeft}</span></> : ' — date à définir'}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="hidden sm:flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-stone-200 shadow-sm">
            <Search className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  router.push(`/vendors?search=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              placeholder="Rechercher…"
              className="text-sm text-charcoal-700 placeholder-charcoal-400 bg-transparent outline-none w-32"
            />
          </div>
          {/* CTA */}
          <Link href="/espace-client/prestataires"
            className="flex items-center gap-1.5 bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-charcoal-700 transition-colors whitespace-nowrap shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Prestataires
          </Link>
        </div>
      </div>

      {/* ── ROW 1: Featured beige card + Dark J-X card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* FEATURED — dark action card */}
        <div className="lg:col-span-3 rounded-2xl bg-charcoal-900 text-white shadow-sm overflow-hidden p-6 relative" style={{ minHeight: 240 }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-white/70 text-sm font-medium">Votre mariage</h2>
              <Link href="/espace-client/mariage" className="text-xs text-rose-400 hover:text-rose-300">
                Modifier
              </Link>
            </div>

            <div className="mt-2">
              <p className="text-white/50 text-[0.65rem] uppercase tracking-wider mb-1">Budget total</p>
              <p className="font-serif text-white leading-none" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 400 }}>
                {budget > 0 ? budget.toLocaleString('fr-FR') : '—'} <span className="text-2xl text-white/60">€</span>
              </p>
            </div>

            <div className="mt-3 space-y-0.5 text-xs text-white/60">
              <p className="font-medium text-white/80">{coupleName}</p>
              <p>{fmtDate}{venue !== 'Aucun lieu choisi' ? ` · ${venue}` : ''}</p>
            </div>

            <div className="mt-auto pt-5 flex flex-wrap gap-2">
              <Link href="/espace-client/mariage" className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white text-xs font-medium rounded-full hover:bg-rose-400 transition-colors">
                Gérer <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/espace-client/invites" className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-500/40 text-white text-xs font-medium rounded-full hover:bg-rose-500/10 transition-colors">
                Invités <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/espace-client/prestataires" className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-500/40 text-white text-xs font-medium rounded-full hover:bg-rose-500/10 transition-colors">
                Prestataires <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* J-X CARD — modern minimal */}
        <div data-tour="countdown" className="lg:col-span-2 rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden" style={{ minHeight: 240 }}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-charcoal-500 text-sm font-medium">Compte à rebours</h2>
              <span className="text-charcoal-400 text-xs">{new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
            </div>
            {/* Big number */}
            <div className="flex-1 flex flex-col items-center justify-center py-2">
              <div className="relative flex items-end justify-center gap-1">
                {daysLeft !== null ? (
                  <><span className="font-serif text-rose-600 text-2xl font-light leading-none mb-1">J-</span>
                  <p className="font-serif text-charcoal-900 leading-none" style={{ fontSize: 'clamp(3.5rem, 7vw, 5rem)', fontWeight: 300, letterSpacing: '-0.04em' }}>
                    {daysLeft > 0 ? daysLeft : '0'}
                  </p></>
                ) : (
                  <p className="font-serif text-charcoal-400 text-xl font-light">Date à définir</p>
                )}
              </div>
              <p className="text-charcoal-400 text-xs mt-2">jours avant votre mariage</p>
            </div>
            {/* Date + venue */}
            <div className="border-t border-stone-100 pt-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-rose-500 flex-shrink-0" />
                <span className="text-charcoal-600 text-xs">{fmtDate}</span>
              </div>
              {venue !== 'Lieu à définir' && (
                <div className="flex items-center gap-2">
                  <Heart className="w-3 h-3 text-rose-500 flex-shrink-0" />
                  <span className="text-charcoal-600 text-xs">{venue}</span>
                </div>
              )}
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'Prestataires', value: `${teamVendors.length}` },
                { label: 'Invités', value: `${guestStats.total || totalGuests || '—'}` },
                { label: 'Tâches', value: `${checkPct}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-stone-50 rounded-xl p-2 text-center">
                  <p className="text-charcoal-900 font-semibold text-sm">{value}</p>
                  <p className="text-charcoal-400 text-[0.58rem] mt-0.5 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Invités gauge + Checklist bar + Équipe list ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="quick-actions">

        {/* INVITÉS — "Steps for Today" card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold text-charcoal-900 text-sm">Vos invités</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">Gérez votre liste</p>
            </div>
            <Link href="/espace-client/invites" className="text-xs text-charcoal-400 hover:text-charcoal-700 flex items-center gap-0.5">
              Voir <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {/* Gauge */}
          <div className="mt-2 mb-1">
            <GaugeChart value={guestStats.confirmed} max={Math.max(guestStats.total, totalGuests, 1)} color="#E11D48" />
          </div>
          <Link href="/espace-client/invites"
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-charcoal-700 text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Ajouter un invité
          </Link>
        </div>

        {/* CHECKLIST — "Weight Loss Plan" card */}
        <div data-tour="progress" className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3 className="font-semibold text-charcoal-900 text-sm">Votre checklist</h3>
              <p className="text-xs text-charcoal-500 mt-0.5">Préparez chaque détail</p>
            </div>
            <Link href="/espace-client/checklist" className="text-xs text-charcoal-400 hover:text-charcoal-700 flex items-center gap-0.5">
              Voir <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {/* Big % */}
          <div className="flex items-end justify-between mt-5 mb-2">
            <p className="font-serif text-charcoal-900 leading-none" style={{ fontSize: '2.75rem', fontWeight: 300 }}>{checkPct}</p>
            <p className="text-charcoal-500 text-sm mb-1">% complété</p>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-rose-600 rounded-full transition-all duration-700" style={{ width: `${checkPct}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-charcoal-400 mb-5">
            <span>{taskStats.done} réalisées</span>
            <span>{taskStats.total} au total</span>
          </div>
          <Link href="/espace-client/checklist"
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-charcoal-700 text-sm font-medium rounded-xl transition-colors">
            <CheckSquare className="w-3.5 h-3.5" /> Voir la checklist
          </Link>
        </div>

        {/* MON ÉQUIPE — "My Habits" card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-semibold text-charcoal-900 text-sm">Mon équipe pro</h3>
            <Link href="/espace-client/prestataires"
              className="flex items-center gap-1 text-xs font-medium text-charcoal-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors">
              Ajouter <Plus className="w-3 h-3" />
            </Link>
          </div>
          {teamVendors.length === 0 ? (
            <div className="py-4 text-center">
              <Users className="w-8 h-8 text-charcoal-200 mx-auto mb-2" />
              <p className="text-xs text-charcoal-400">Aucun prestataire ajouté</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamVendors.map(v => {
                const initials = v.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <div key={v.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-stone-100">
                      {v.photo ? <img src={v.photo} alt={v.name} className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full bg-gradient-to-br from-champagne-200 to-rose-200 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-charcoal-700">{initials}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-charcoal-900 truncate">{v.name}</p>
                      <p className="text-[0.65rem] text-charcoal-400">{v.category}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/espace-client/prestataires"
            className="mt-4 flex items-center justify-center gap-1 text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors">
            Voir tous les prestataires <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
