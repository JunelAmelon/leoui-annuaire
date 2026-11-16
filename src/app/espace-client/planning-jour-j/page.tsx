'use client';

/**
 * Planning du jour J — espace du couple.
 * Composition root : instancie les repositories Firestore et les injecte dans les services.
 * La page orchestre l'écran ; règles métier et accès données vivent dans `src/features/day-plan`.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Download, Plus, Radio, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { ValidationError } from '@/lib/market/errors';
import {
  CATEGORIES, CATEGORY_KEYS, DAY_KEYS, DAY_LABELS,
  type DayKey, type DayPlan, type TimelineCategory, type TimelineItem, type TimelineItemInput, type VendorRequest,
} from '@/features/day-plan/domain/types';
import {
  detectAlerts, endOf, formatLongDate, localNow, normalizeWeddingDate, sortItems, timeOf,
  toGazetteProgram, toPlaylistMoments, type TimelineAlert,
} from '@/features/day-plan/domain/timeline';
import { FirestoreDayPlanRepository, FirestoreVendorRequestRepository } from '@/features/day-plan/repositories/firestore-day-plan.repository';
import { DayPlanService, findItem } from '@/features/day-plan/services/day-plan.service';
import { generateDayPlanPdf } from '@/features/day-plan/services/day-plan-pdf.service';
import { Timeline } from '@/features/day-plan/ui/Timeline';
import { ItemModal } from '@/features/day-plan/ui/ItemModal';
import { SharePanel } from '@/features/day-plan/ui/SharePanel';
import { LiveView } from '@/features/day-plan/ui/LiveView';
import { FirestoreGazetteRepository } from '@/features/gazette/repositories/firestore-gazette.repository';
import { GazetteService } from '@/features/gazette/services/gazette.service';

const service = new DayPlanService(new FirestoreDayPlanRepository(), new FirestoreVendorRequestRepository());
const gazetteService = new GazetteService(new FirestoreGazetteRepository());

const kicker = 'text-[10px] font-semibold tracking-[0.2em] uppercase';
const shortDate = (date: string) => (date ? formatLongDate(date).replace(/ \d{4}$/, '') : '');

export default function PlanningJourJPage() {
  const { user } = useAuth();
  const { client, event, loading: clientLoading } = useClientData();
  const eventId = event?.id || client?.id || '';
  const weddingDate = normalizeWeddingDate(event?.event_date || (client as { event_date?: string } | null)?.event_date);
  const coupleNames = event?.couple_names || [client?.name, (client as { partner?: string } | null)?.partner].filter(Boolean).join(' & ') || 'Notre mariage';

  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeKey, setActiveKey] = useState<DayKey>('day');
  const [filter, setFilter] = useState<TimelineCategory | null>(null);
  const [modal, setModal] = useState<{ item?: TimelineItem } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shareOpen, setShareOpen] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (clientLoading) return;
    if (!eventId || !user?.uid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const loaded = await service.getOrCreate(eventId, user.uid, weddingDate ?? localNow().slice(0, 10));
        if (cancelled) return;
        setPlan(loaded);
        // Les propositions ne bloquent pas l'affichage du planning.
        service.listRequests(eventId).then((r) => { if (!cancelled) setRequests(r); }).catch(() => {});
      } catch (e) {
        console.error('Planning jour J :', e);
        if (!cancelled) toast.error('Impossible d’ouvrir le planning.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientLoading, eventId, user?.uid, weddingDate]);

  /** Exécute un cas d'usage, met l'écran à jour, et traduit les erreurs en messages. */
  const run = useCallback(async (action: () => Promise<DayPlan>, success?: string): Promise<boolean> => {
    setBusy(true);
    setErrors({});
    try {
      setPlan(await action());
      if (success) toast.success(success);
      return true;
    } catch (e) {
      if (e instanceof ValidationError && e.fields) setErrors(e.fields);
      toast.error(e instanceof Error ? e.message : 'Une erreur est survenue.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const block = plan?.days[activeKey];
  const alerts = useMemo(() => (block ? detectAlerts(block.items) : []), [block]);
  const alertCounts = useMemo(() => {
    const counts = {} as Record<DayKey, number>;
    for (const k of DAY_KEYS) counts[k] = plan ? detectAlerts(plan.days[k].items).filter((a) => a.level !== 'info').length : 0;
    return counts;
  }, [plan]);
  const vendorLabels = useMemo(() => Object.fromEntries((plan?.share.vendor_links ?? []).map((l) => [l.vendor_id, l.label])), [plan]);
  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (plan) for (const k of DAY_KEYS) for (const i of plan.days[k].items) for (const v of i.vendor_ids) counts[v] = (counts[v] ?? 0) + 1;
    return counts;
  }, [plan]);
  const knownPlaces = useMemo(() => {
    const names = new Set<string>();
    if (plan) for (const k of DAY_KEYS) for (const i of plan.days[k].items) if (i.location.name) names.add(i.location.name);
    for (const v of [event?.venue, event?.reception_venue]) if (v) names.add(v);
    return [...names];
  }, [plan, event?.venue, event?.reception_venue]);
  const pending = requests.filter((r) => r.status === 'pending');
  const closeModal = useCallback(() => { setModal(null); setErrors({}); }, []);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const closeLive = useCallback(() => setLive(false), []);

  if (clientLoading || loading) {
    return (
      <div className="w-full animate-pulse space-y-5">
        <div className="h-56 bg-white border border-stone-200" />
        <div className="h-[50vh] bg-white border border-stone-200" />
      </div>
    );
  }

  if (!plan || !block) {
    return (
      <div className="w-full bg-white border border-stone-200 px-6 py-20 text-center">
        <p className="font-serif italic text-charcoal-500 text-2xl">Le planning n’est pas encore disponible</p>
        <p className="text-sm text-charcoal-400 mt-2">Renseignez d’abord votre mariage pour commencer.</p>
        <Link href="/espace-client/mariage" className="inline-block mt-6 text-[13px] text-charcoal-900 border-b border-charcoal-900 pb-0.5 hover:text-rose-600 hover:border-rose-600">Ouvrir « Mon mariage »</Link>
      </div>
    );
  }

  const sorted = sortItems(block.items);
  const shown = filter ? { ...block, items: sorted.filter((i) => i.category === filter) } : block;
  const usedCategories = CATEGORY_KEYS.filter((c) => sorted.some((i) => i.category === c));
  const totalItems = DAY_KEYS.reduce((n, k) => n + plan.days[k].items.length, 0);
  const gazetteProgram = toGazetteProgram(plan);
  const playlistMoments = toPlaylistMoments(plan);

  const saveItem = async (input: TimelineItemInput, targetKey: DayKey) => {
    const editing = modal?.item;
    const ok = await run(
      () => (editing ? service.updateItem(plan, activeKey, editing.id, input, targetKey) : service.addItem(plan, targetKey, input)),
      editing ? 'Moment mis à jour.' : 'Moment ajouté.'
    );
    if (ok) { setModal(null); setActiveKey(targetKey); }
  };

  const deleteItem = async () => {
    const editing = modal?.item;
    if (!editing || !confirm(`Supprimer « ${editing.title} » ?`)) return;
    if (await run(() => service.removeItem(plan, activeKey, editing.id), 'Moment supprimé.')) setModal(null);
  };

  const resolveAlert = (alert: TimelineAlert, cascade: boolean) =>
    run(() => service.shift(plan, activeKey, alert.item_id, alert.missing_min, cascade), cascade ? 'La suite de la journée a été décalée.' : 'Moment décalé.');

  const decide = async (request: VendorRequest, accept: boolean, cascade = false) => {
    const ok = await run(() => service.decideRequest(plan, request, accept, cascade), accept ? 'Horaire mis à jour.' : 'Proposition refusée.');
    if (ok) setRequests((list) => list.map((r) => (r.id === request.id ? { ...r, status: accept ? 'accepted' : 'declined' } : r)));
  };

  const exportPdf = async (vendor?: { vendor_id: string; label: string }) => {
    try {
      await generateDayPlanPdf(plan.days, { title: coupleNames, vendor });
    } catch (e) {
      console.error(e);
      toast.error('Le PDF n’a pas pu être généré.');
    }
  };

  const sendToGazette = async () => {
    if (!gazetteProgram.length) { toast.error('Aucun moment du jour J à publier pour l’instant.'); return; }
    setBusy(true);
    try {
      const gazette = await gazetteService.getOrCreateGazette(eventId, user?.uid || plan.owner_id, {
        title: `La Gazette de ${coupleNames}`,
        weddingDate: plan.days.day.date,
        locationName: event?.venue || event?.reception_venue || '',
      });
      await gazetteService.syncProgramFromDayPlan(eventId, gazetteProgram, gazette.version);
      toast.success(`Programme envoyé à la Gazette (${gazetteProgram.length} moments).`);
    } catch (e) {
      console.error(e);
      toast.error('Envoi à la Gazette impossible.');
    } finally {
      setBusy(false);
    }
  };

  const outline = 'inline-flex items-center justify-center gap-2 h-11 px-5 border border-stone-300 text-charcoal-800 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm';

  return (
    <div className="w-full pb-10 space-y-5">
      {/* ── En-tête ── */}
      <header className="relative bg-white border border-stone-200 overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_24rem]">
          <div className="px-5 sm:px-9 lg:px-12 pt-8 sm:pt-11 pb-7">
            <p className={`${kicker} text-rose-600`}>Le jour J</p>
            <h1 className="font-serif text-charcoal-900 mt-3 leading-none" style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>Planning du jour J</h1>
            <p className="text-[15px] text-charcoal-500 mt-3 first-letter:uppercase">{formatLongDate(plan.days.day.date)}</p>
            {!weddingDate && (
              <p className="text-[13px] text-charcoal-600 mt-3 border-l-2 border-amber-500 pl-3">
                Date du mariage non renseignée : le planning est calé sur aujourd’hui en attendant.{' '}
                <Link href="/espace-client/mariage" className="underline underline-offset-2 hover:text-rose-600">La renseigner</Link>
              </p>
            )}

            <div className="flex flex-wrap gap-3 mt-8">
              <button type="button" onClick={() => setModal({})}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 transition-colors rounded-sm">
                <Plus className="w-4 h-4" /> Ajouter un moment
              </button>
              <button type="button" onClick={() => setLive(true)} disabled={!totalItems} className={`${outline} disabled:opacity-40`}><Radio className="w-4 h-4" /> Vue en direct</button>
              <button type="button" onClick={() => setShareOpen(true)} className={outline}>
                <Share2 className="w-4 h-4" /> Partager
                {pending.length > 0 && <span className="min-w-[1.15rem] h-[1.15rem] px-1 bg-rose-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">{pending.length}</span>}
              </button>
              <button type="button" onClick={() => exportPdf()} disabled={!totalItems} className={`${outline} disabled:opacity-40`}><Download className="w-4 h-4" /> PDF</button>
            </div>
          </div>

          <div className="relative order-first lg:order-none h-48 sm:h-60 lg:h-auto lg:min-h-[17rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/jour-j-cover.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_28%]" />
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent hidden lg:block" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1A1013]/85 to-transparent" />
            <p className="absolute bottom-4 sm:bottom-5 right-5 sm:right-6 left-5 lg:left-10 text-right font-serif italic text-white text-base sm:text-lg leading-snug" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
              « Une journée réussie, c’est une journée où personne ne regarde sa montre. »
            </p>
          </div>
        </div>

        {/* Journées */}
        <nav className="flex gap-x-8 px-5 sm:px-9 lg:px-12 border-t border-stone-200 overflow-x-auto subtle-scroll" aria-label="Journées">
          {DAY_KEYS.map((k) => (
            <button key={k} type="button" onClick={() => { setActiveKey(k); setFilter(null); }}
              className={`py-4 -mb-px text-left whitespace-nowrap border-b-2 transition-colors ${activeKey === k ? 'border-rose-600' : 'border-transparent hover:border-stone-300'}`}>
              <span className={`flex items-center gap-2 text-[14px] ${activeKey === k ? 'text-charcoal-900 font-medium' : 'text-charcoal-500'}`}>
                {DAY_LABELS[k]}
                <span className="text-charcoal-300 tabular-nums font-normal">{plan.days[k].items.length}</span>
                {alertCounts[k] > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-label={`${alertCounts[k]} alerte(s)`} />}
              </span>
              <span className="block text-[11px] text-charcoal-400 mt-0.5">{shortDate(plan.days[k].date)}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* ── Propositions des prestataires ── */}
      {pending.length > 0 && (
        <section className="bg-white border border-stone-200 border-l-2 border-l-rose-600 px-5 sm:px-9 py-6">
          <p className={`${kicker} text-rose-600`}>{pending.length} proposition{pending.length > 1 ? 's' : ''} de vos prestataires</p>
          <ul className="divide-y divide-stone-200 mt-2">
            {pending.map((r) => {
              const found = findItem(plan, r.item_id);
              return (
                <li key={r.id} className="py-4 grid md:grid-cols-[1fr_auto] gap-x-8 gap-y-3 items-center">
                  <div className="min-w-0">
                    <p className="font-serif text-charcoal-900 text-lg leading-snug">
                      {r.vendor_label} propose{' '}
                      {found ? <>de passer « {found.item.title} » de <span className="tabular-nums">{timeOf(found.item.start_at)}</span> à <span className="tabular-nums text-rose-700">{timeOf(r.proposed_start_at)}</span></> : 'un horaire pour un moment supprimé depuis'}
                    </p>
                    {r.reason && <p className="font-serif italic text-charcoal-500 text-[15px] mt-1">« {r.reason} »</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                    {found && <button type="button" disabled={busy} onClick={() => decide(r, true)} className="h-10 px-4 bg-charcoal-900 text-white font-medium hover:bg-rose-600 disabled:opacity-40 transition-colors rounded-sm">Accepter</button>}
                    {found && <button type="button" disabled={busy} onClick={() => decide(r, true, true)} className="text-charcoal-800 border-b border-charcoal-800 pb-px hover:text-rose-600 hover:border-rose-600 disabled:opacity-40">Accepter et décaler la suite</button>}
                    <button type="button" disabled={busy} onClick={() => decide(r, false)} className="text-charcoal-500 hover:text-rose-600 disabled:opacity-40">Refuser</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_21rem] gap-5 items-start">
        {/* ── Chronologie ── */}
        <section className="bg-white border border-stone-200 px-4 sm:px-9 lg:px-12 py-7 sm:py-9 min-h-[24rem]">
          {sorted.length === 0 ? (
            <div className="py-12 sm:py-16 text-center max-w-md mx-auto">
              <p className="font-serif italic text-charcoal-500 text-2xl">Rien de prévu {activeKey === 'day' ? 'le jour J' : activeKey === 'eve' ? 'la veille' : 'le lendemain'}</p>
              <p className="text-sm text-charcoal-400 mt-2 leading-relaxed">Ajoutez vos moments un à un, ou partez d’un déroulé type que vous ajusterez ensuite.</p>
              <div className="flex flex-wrap justify-center gap-3 mt-7">
                <button type="button" onClick={() => setModal({})} className="h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 transition-colors rounded-sm">Ajouter un moment</button>
                <button type="button" disabled={busy} onClick={() => run(() => service.applyTemplate(plan), 'Déroulé type ajouté. Ajustez-le à votre journée.')} className={`${outline} disabled:opacity-40`}>Partir d’un déroulé type</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pb-6 mb-7 border-b border-charcoal-100">
                <p className="text-[13px] text-charcoal-500">
                  De <span className="tabular-nums text-charcoal-900">{timeOf(sorted[0].start_at)}</span> à{' '}
                  <span className="tabular-nums text-charcoal-900">{timeOf(sorted.reduce((max, i) => (endOf(i) > max ? endOf(i) : max), sorted[0].start_at))}</span>
                  {alerts.some((a) => a.level !== 'info') && <span className="text-amber-700"> · {alerts.filter((a) => a.level !== 'info').length} enchaînement{alerts.filter((a) => a.level !== 'info').length > 1 ? 's' : ''} à revoir</span>}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  <button type="button" onClick={() => setFilter(null)} className={`pb-0.5 border-b text-[13px] ${!filter ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'}`}>Tout</button>
                  {usedCategories.map((c) => (
                    <button key={c} type="button" onClick={() => setFilter(filter === c ? null : c)}
                      className={`inline-flex items-center gap-1.5 pb-0.5 border-b text-[13px] ${filter === c ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'}`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORIES[c].color }} />{CATEGORIES[c].label}
                    </button>
                  ))}
                </div>
              </div>

              <Timeline block={shown} alerts={filter ? [] : alerts} vendorLabels={vendorLabels} busy={busy}
                onEdit={(item) => setModal({ item })} onShift={resolveAlert} />

              <button type="button" onClick={() => setModal({})} className="mt-8 inline-flex items-center gap-2 text-[13px] text-charcoal-900 border-b border-charcoal-900 pb-0.5 hover:text-rose-600 hover:border-rose-600 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Ajouter un moment
              </button>
            </>
          )}
        </section>

        {/* ── Colonne latérale ── */}
        <aside className="space-y-5">
          <section className="bg-white border border-stone-200 p-6 sm:p-7">
            <p className={`${kicker} text-rose-600`}>Prestataires</p>
            {plan.share.vendor_links.filter((l) => !l.token_revoked_at).length === 0 ? (
              <p className="text-[13.5px] text-charcoal-500 mt-3 leading-relaxed">Partagez le déroulé avec votre traiteur, votre photographe ou votre DJ. Ils pourront vous proposer un autre horaire.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-200">
                {plan.share.vendor_links.filter((l) => !l.token_revoked_at).map((l) => (
                  <li key={l.vendor_id} className="py-3 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-serif text-charcoal-900 text-lg leading-tight truncate">{l.label}</p>
                      <p className="text-[12px] text-charcoal-400">{itemCounts[l.vendor_id] ?? 0} moment{(itemCounts[l.vendor_id] ?? 0) > 1 ? 's' : ''}</p>
                    </div>
                    <button type="button" onClick={() => exportPdf({ vendor_id: l.vendor_id, label: l.label })} disabled={!itemCounts[l.vendor_id]}
                      className="text-[12.5px] text-charcoal-500 hover:text-rose-600 disabled:opacity-30 flex-shrink-0">Feuille de route</button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setShareOpen(true)} className="mt-4 text-[13px] text-charcoal-900 border-b border-charcoal-900 pb-0.5 hover:text-rose-600 hover:border-rose-600 transition-colors">Gérer le partage</button>
          </section>

          <section className="bg-white border border-stone-200 p-6 sm:p-7">
            <p className={`${kicker} text-rose-600`}>Relié au reste</p>

            <div className="mt-4">
              <p className="font-serif text-charcoal-900 text-lg leading-tight">La Gazette</p>
              <p className="text-[13px] text-charcoal-500 mt-1 leading-relaxed">
                {gazetteProgram.length
                  ? `${gazetteProgram.length} moment${gazetteProgram.length > 1 ? 's' : ''} du jour J visible${gazetteProgram.length > 1 ? 's' : ''} des invités : cérémonie, cocktail, repas, soirée.`
                  : 'Les moments visibles des invités (cérémonie, cocktail, repas, soirée) formeront le programme du journal.'}
              </p>
              <button type="button" disabled={busy || !gazetteProgram.length} onClick={sendToGazette}
                className="mt-2.5 text-[13px] text-charcoal-900 border-b border-charcoal-900 pb-0.5 hover:text-rose-600 hover:border-rose-600 disabled:opacity-35 transition-colors">Envoyer le programme à la Gazette</button>
            </div>

            <div className="mt-6 pt-5 border-t border-stone-200">
              <p className="font-serif text-charcoal-900 text-lg leading-tight">La Playlist</p>
              <p className="text-[13px] text-charcoal-500 mt-1 leading-relaxed">
                {playlistMoments.length
                  ? 'Ces moments serviront de repères musicaux dès que la Playlist sera en ligne :'
                  : 'Cérémonie, cocktail, repas et soirée deviendront les repères musicaux de la Playlist.'}
              </p>
              {playlistMoments.length > 0 && (
                <ul className="mt-2.5 space-y-1">
                  {playlistMoments.slice(0, 8).map((m) => (
                    <li key={m.id} className="grid grid-cols-[3rem_1fr] gap-x-2 text-[13px]">
                      <span className="tabular-nums text-charcoal-400">{timeOf(m.start_at)}</span>
                      <span className="text-charcoal-700 truncate">{m.label}</span>
                    </li>
                  ))}
                  {playlistMoments.length > 8 && <li className="text-[12px] text-charcoal-400">et {playlistMoments.length - 8} autres</li>}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>

      {modal && (
        <ItemModal key={modal.item?.id ?? 'new'} item={modal.item} dayKey={activeKey} vendors={plan.share.vendor_links} knownPlaces={knownPlaces}
          saving={busy} errors={errors} onSave={saveItem} onDelete={modal.item ? deleteItem : undefined} onClose={closeModal} />
      )}

      {shareOpen && (
        <SharePanel plan={plan} busy={busy} itemCounts={itemCounts} onClose={closeShare}
          onEnableShare={() => run(() => service.enableShare(plan), 'Lien prêt à être partagé.')}
          onRevokeShare={() => run(() => service.revokeShare(plan), 'Lien désactivé.')}
          onAddVendor={(labelText) => run(() => service.addVendorLink(plan, labelText), 'Prestataire ajouté.')}
          onSetVendorAccess={(id, active) => run(() => service.setVendorAccess(plan, id, active), active ? 'Nouveau lien créé.' : 'Accès coupé.')} />
      )}

      {live && <LiveView days={plan.days} title={coupleNames} onClose={closeLive} />}
    </div>
  );
}
