'use client';

/**
 * Lien partagé du Planning du jour J — témoins (lecture seule) et prestataires (lecture + proposition d'horaire).
 * Aucun compte requis : toutes les données passent par l'API, qui valide le jeton.
 */

import { useCallback, useEffect, useState } from 'react';
import { Download, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { DAY_KEYS, DAY_LABELS, LIMITS, type DayKey, type TimelineItem, type VendorRequest } from '@/features/day-plan/domain/types';
import { formatLongDate, localNow, timeOf } from '@/features/day-plan/domain/timeline';
import type { PublicDayPlanView } from '@/features/day-plan/services/day-plan-share.service';
import { generateDayPlanPdf } from '@/features/day-plan/services/day-plan-pdf.service';
import { Timeline } from '@/features/day-plan/ui/Timeline';
import { LiveView } from '@/features/day-plan/ui/LiveView';

type View = PublicDayPlanView & { couple_names: string };

const STATUS: Record<VendorRequest['status'], { label: string; cls: string }> = {
  pending: { label: 'En attente de réponse', cls: 'text-amber-700' },
  accepted: { label: 'Acceptée', cls: 'text-emerald-700' },
  declined: { label: 'Refusée', cls: 'text-charcoal-400' },
};

const kicker = 'text-[10px] font-semibold tracking-[0.2em] uppercase';

export default function SharedDayPlanPage({ params }: { params: { eventId: string; token: string } }) {
  const endpoint = `/api/day-plan/share/${encodeURIComponent(params.eventId)}/${encodeURIComponent(params.token)}`;
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState('');
  const [activeKey, setActiveKey] = useState<DayKey>('day');
  const [live, setLive] = useState(false);
  const [proposing, setProposing] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Lien invalide');
      setView(data as View);
      setError('');
      return data as View;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lien invalide');
      return null;
    }
  }, [endpoint]);

  useEffect(() => {
    load().then((data) => {
      if (!data) return;
      // Ouvre directement la journée en cours, sinon la première journée remplie.
      const today = localNow().slice(0, 10);
      const current = DAY_KEYS.find((k) => data.days[k].date === today && data.days[k].items.length);
      setActiveKey(current ?? (data.days.day.items.length ? 'day' : DAY_KEYS.find((k) => data.days[k].items.length) ?? 'day'));
    });
  }, [load]);

  const closeLive = useCallback(() => setLive(false), []);
  const refresh = useCallback(() => { void load(); }, [load]);

  if (error) {
    return (
      <main className="min-h-[100dvh] bg-[#FAF6F2] flex items-center justify-center px-6 text-center">
        <div className="max-w-sm">
          <p className={`${kicker} text-rose-600`}>LeOui.net</p>
          <h1 className="font-serif text-charcoal-900 text-3xl mt-4 leading-tight">Ce lien ne fonctionne plus</h1>
          <p className="text-[15px] text-charcoal-500 mt-3 leading-relaxed">{error}</p>
        </div>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="min-h-[100dvh] bg-[#FAF6F2] flex items-center justify-center">
        <p className="font-serif italic text-charcoal-400 text-xl">Ouverture du planning…</p>
      </main>
    );
  }

  const vendor = view.viewer.kind === 'vendor' ? view.viewer : null;
  const vendorLabels = Object.fromEntries(view.vendors.map((v) => [v.vendor_id, v.label]));
  const mineCount = vendor ? DAY_KEYS.reduce((n, k) => n + view.days[k].items.filter((i) => i.vendor_ids.includes(vendor.vendor_id)).length, 0) : 0;
  const total = DAY_KEYS.reduce((n, k) => n + view.days[k].items.length, 0);
  const titleOf = (itemId: string) => DAY_KEYS.flatMap((k) => view.days[k].items).find((i) => i.id === itemId)?.title ?? 'Moment supprimé';

  const startProposal = (item: TimelineItem) => { setProposing(item.id); setTime(timeOf(item.start_at)); setReason(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposing) return;
    setSending(true);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item_id: proposing, time, reason }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Envoi impossible');
      toast.success('Proposition envoyée aux mariés.');
      setProposing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  const pdf = async () => {
    try {
      await generateDayPlanPdf(view.days, { title: view.couple_names, vendor: vendor && mineCount ? { vendor_id: vendor.vendor_id, label: vendor.label } : undefined });
    } catch {
      toast.error('Le PDF n’a pas pu être généré.');
    }
  };

  const outline = 'inline-flex items-center justify-center gap-2 h-11 px-5 border border-white/35 text-white text-[13px] font-medium hover:bg-white hover:text-charcoal-900 transition-colors rounded-sm';

  return (
    <main className="min-h-[100dvh] bg-[#FAF6F2]">
      {/* ── Bandeau ── */}
      <header className="relative bg-[#1A1412] text-white overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jour-j-cover.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_28%] opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1412] via-[#1A1412]/60 to-[#1A1412]/30" />
        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-8">
          <p className={`${kicker} text-rose-300`}>Planning du jour J</p>
          <h1 className="font-serif mt-3 leading-[1.02] break-words" style={{ fontSize: 'clamp(2.3rem, 7vw, 4.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>{view.couple_names || 'Le mariage'}</h1>
          <p className="font-serif italic text-white/70 text-lg sm:text-xl mt-2 first-letter:uppercase">{view.days.day.date ? formatLongDate(view.days.day.date) : ''}</p>
          <p className="text-[14px] text-white/65 mt-5 max-w-xl leading-relaxed">
            {vendor
              ? mineCount
                ? `Bonjour ${vendor.label}. Vos ${mineCount} moment${mineCount > 1 ? 's' : ''} sont mis en avant. Un horaire ne vous convient pas ? Proposez-en un autre, les mariés vous répondront.`
                : `Bonjour ${vendor.label}. Les mariés ne vous ont pas encore attribué de moment : voici le déroulé complet en attendant.`
              : 'Le déroulé des trois journées, à jour en permanence.'}
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button type="button" onClick={() => setLive(true)} disabled={!total} className={`${outline} disabled:opacity-40`}><Radio className="w-4 h-4" /> Vue en direct</button>
            <button type="button" onClick={pdf} disabled={!total} className={`${outline} disabled:opacity-40`}><Download className="w-4 h-4" /> {vendor && mineCount ? 'Ma feuille de route' : 'PDF'}</button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-0 sm:px-8 pb-16">
        <div className="bg-white border-x-0 sm:border-x border-b border-stone-200 sm:-mt-px">
          <nav className="flex gap-x-8 px-5 sm:px-10 border-b border-stone-200 overflow-x-auto subtle-scroll" aria-label="Journées">
            {DAY_KEYS.map((k) => (
              <button key={k} type="button" onClick={() => setActiveKey(k)}
                className={`py-4 -mb-px text-left whitespace-nowrap border-b-2 transition-colors ${activeKey === k ? 'border-rose-600' : 'border-transparent'}`}>
                <span className={`text-[14px] ${activeKey === k ? 'text-charcoal-900 font-medium' : 'text-charcoal-500'}`}>{DAY_LABELS[k]} <span className="text-charcoal-300 tabular-nums font-normal ml-1">{view.days[k].items.length}</span></span>
                <span className="block text-[11px] text-charcoal-400 mt-0.5">{view.days[k].date ? formatLongDate(view.days[k].date).replace(/ \d{4}$/, '') : ''}</span>
              </button>
            ))}
          </nav>

          <div className="px-4 sm:px-10 py-8 sm:py-10">
            {view.days[activeKey].items.length === 0 ? (
              <p className="py-14 text-center font-serif italic text-charcoal-400 text-2xl">Rien de prévu ce jour-là</p>
            ) : (
              <Timeline
                block={view.days[activeKey]}
                vendorLabels={vendorLabels}
                highlightVendorId={vendor && mineCount ? vendor.vendor_id : undefined}
                renderExtra={(item) => {
                  if (!vendor || !item.vendor_ids.includes(vendor.vendor_id)) return null;
                  if (proposing !== item.id) {
                    return (
                      <button type="button" onClick={() => startProposal(item)} className="mt-3 text-[13px] text-charcoal-900 border-b border-charcoal-900 pb-0.5 hover:text-rose-600 hover:border-rose-600 transition-colors">
                        Proposer un autre horaire
                      </button>
                    );
                  }
                  return (
                    <form onSubmit={submit} className="mt-4 border-l-2 border-rose-600 bg-[#FBF8F4] px-4 py-4 space-y-4 max-w-md">
                      <label className="block">
                        <span className={`${kicker} text-charcoal-400`}>Nouvelle heure de début</span>
                        <input type="time" required value={time} onChange={(e) => setTime(e.target.value)}
                          className="block w-36 bg-transparent border-0 border-b border-stone-300 px-0 py-2 text-xl tabular-nums focus:outline-none focus:ring-0 focus:border-rose-500 rounded-none" />
                      </label>
                      <label className="block">
                        <span className={`${kicker} text-charcoal-400`}>Pourquoi</span>
                        <textarea rows={2} value={reason} maxLength={LIMITS.REASON} onChange={(e) => setReason(e.target.value)} placeholder="Ex : il me faut 30 min de mise en place"
                          className="block w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2 text-[15px] resize-none placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 rounded-none" />
                      </label>
                      <div className="flex items-center gap-4">
                        <button type="submit" disabled={sending || !time} className="h-10 px-5 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-40 transition-colors rounded-sm">{sending ? 'Envoi…' : 'Envoyer aux mariés'}</button>
                        <button type="button" onClick={() => setProposing(null)} className="text-[13px] text-charcoal-500 hover:text-charcoal-900">Annuler</button>
                      </div>
                    </form>
                  );
                }}
              />
            )}
          </div>
        </div>

        {vendor && view.requests.length > 0 && (
          <section className="bg-white border-x-0 sm:border-x border-b border-stone-200 px-5 sm:px-10 py-8">
            <p className={`${kicker} text-rose-600`}>Vos propositions</p>
            <ul className="divide-y divide-stone-200 mt-2">
              {view.requests.map((r) => (
                <li key={r.id} className="py-3.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                  <p className="font-serif text-charcoal-900 text-lg leading-snug">{titleOf(r.item_id)} <span className="text-charcoal-400">à</span> <span className="tabular-nums">{timeOf(r.proposed_start_at)}</span></p>
                  <p className={`text-[12.5px] ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-[12px] text-charcoal-400 mt-8 px-5">Planning partagé avec <span className="font-serif text-charcoal-600 text-[14px]">LeOui.net</span></p>
      </div>

      {live && <LiveView days={view.days} title={view.couple_names} onClose={closeLive} onRefresh={refresh} />}
    </main>
  );
}
