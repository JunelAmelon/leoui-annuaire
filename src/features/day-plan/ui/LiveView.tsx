'use client';

/**
 * Vue en direct du jour J : ce qui se passe maintenant, ce qui suit, et le retard éventuel.
 * Plein écran, lisible à bout de bras, l'écran reste allumé (Wake Lock quand le navigateur le permet).
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, X } from 'lucide-react';
import { CATEGORIES, DAY_KEYS, DAY_LABELS, type DayBlock, type DayKey, type TimelineItem } from '../domain/types';
import { directionsUrl, endOf, formatDuration, formatLongDate, liveState, localNow, minutesBetween, sortItems, timeOf } from '../domain/timeline';

const NUMERAL = "'Bodoni Moda', 'Didot', serif";

interface LiveViewProps {
  days: Record<DayKey, DayBlock>;
  title: string;
  onClose: () => void;
  /** Rafraîchit les données (lien partagé) ; appelé toutes les minutes. */
  onRefresh?: () => void;
}

export function LiveView({ days, title, onClose, onRefresh }: LiveViewProps) {
  const [now, setNow] = useState(() => localNow());

  useEffect(() => {
    const tick = setInterval(() => setNow(localNow()), 15_000);
    const refresh = onRefresh ? setInterval(onRefresh, 60_000) : null;
    document.body.style.overflow = 'hidden';
    let lock: { release: () => Promise<void> } | null = null;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(tick);
      if (refresh) clearInterval(refresh);
      document.body.style.overflow = '';
      void lock?.release().catch(() => {});
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, onRefresh]);

  const items = useMemo(() => DAY_KEYS.flatMap((k) => sortItems(days[k].items)), [days]);
  const state = useMemo(() => liveState(items, now), [items, now]);
  const today = now.slice(0, 10);
  const dayKey = DAY_KEYS.find((k) => days[k].date === today) ?? null;
  const main: TimelineItem | undefined = state.current[state.current.length - 1];
  const upcoming = items.filter((i) => i.start_at > now).slice(state.next ? 1 : 0, 7);

  const headline =
    state.phase === 'empty' ? 'Aucun moment au planning'
    : state.phase === 'before' ? 'Tout commence bientôt'
    : state.phase === 'done' ? 'C’est terminé. Bravo.'
    : state.phase === 'between' ? 'Un instant de pause'
    : main!.title;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-[#17120F] text-white overflow-y-auto overscroll-contain">
      <div className="min-h-full flex flex-col px-5 sm:px-10 lg:px-16 py-5 sm:py-8 max-w-6xl mx-auto">
        {/* Bandeau */}
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.24em] uppercase text-rose-300">
              <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-rose-400" /></span>
              En direct{dayKey ? ` · ${DAY_LABELS[dayKey]}` : ''}
            </p>
            <p className="font-serif text-white/70 text-lg mt-1.5 truncate">{title}</p>
          </div>
          <div className="flex items-start gap-5">
            <div className="text-right">
              <p className="text-[2.6rem] sm:text-[3.6rem] leading-none tabular-nums" style={{ fontFamily: NUMERAL }}>{timeOf(now)}</p>
              <p className="text-[11px] text-white/45 mt-1.5 first-letter:uppercase">{formatLongDate(today)}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Quitter la vue en direct" className="w-10 h-10 flex items-center justify-center border border-white/20 text-white/70 hover:text-white hover:border-white/60 transition-colors rounded-full"><X className="w-4 h-4" /></button>
          </div>
        </header>

        {/* Maintenant */}
        <section className="flex-1 flex flex-col justify-center py-10 sm:py-14">
          <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-white/45">
            {state.phase === 'running' ? 'En ce moment' : state.phase === 'between' || state.phase === 'before' ? 'En attendant' : ''}
          </p>
          <h1 className="font-serif leading-[1.02] mt-3 break-words" style={{ fontSize: 'clamp(2.4rem, 7.5vw, 5.6rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>{headline}</h1>

          {main && (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 text-white/70 text-[15px]">
                <span className="tabular-nums">{timeOf(main.start_at)} — {timeOf(endOf(main))}</span>
                <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORIES[main.category].color }} />{CATEGORIES[main.category].label}</span>
                {main.location.name && <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-white/40" />{main.location.name}</span>}
                {directionsUrl(main.location) && (
                  <a href={directionsUrl(main.location)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200 border-b border-rose-300/40 pb-px">
                    <Navigation className="w-4 h-4" />Itinéraire
                  </a>
                )}
              </div>
              <div className="mt-8 max-w-3xl">
                <div className="h-[3px] bg-white/12"><div className="h-full bg-rose-400 transition-[width] duration-1000" style={{ width: `${Math.round(state.progress * 100)}%` }} /></div>
                <p className="text-[12px] text-white/45 mt-2 tabular-nums">Encore {formatDuration(Math.max(0, minutesBetween(now, endOf(main))))}</p>
              </div>
              {main.notes && <p className="font-serif italic text-white/60 text-lg mt-6 max-w-2xl whitespace-pre-line">{main.notes}</p>}
              {state.current.length > 1 && (
                <p className="text-[13px] text-white/50 mt-5">En parallèle : {state.current.slice(0, -1).map((i) => i.title).join(' · ')}</p>
              )}
            </>
          )}
        </section>

        {/* Ensuite */}
        <footer className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-12 gap-y-8 border-t border-white/15 pt-7 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-white/45">Ensuite</p>
            {state.next ? (
              <div className="grid grid-cols-[auto_1fr] gap-x-5 items-baseline mt-3">
                <p className="text-[2rem] sm:text-[2.6rem] leading-none tabular-nums text-rose-300" style={{ fontFamily: NUMERAL }}>{timeOf(state.next.start_at)}</p>
                <div className="min-w-0">
                  <p className="font-serif text-2xl sm:text-3xl leading-tight break-words">{state.next.title}</p>
                  <p className="text-[13px] text-white/55 mt-1.5">
                    dans {formatDuration(state.minutes_to_next ?? 0)}
                    {state.next.location.name ? ` · ${state.next.location.name}` : ''}
                    {state.next.location.travel_min > 0 && main && main.location.name && main.location.name !== state.next.location.name ? ` · ${state.next.location.travel_min} min de trajet` : ''}
                  </p>
                  {directionsUrl(state.next.location) && (
                    <a href={directionsUrl(state.next.location)!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-[13px] text-rose-300 hover:text-rose-200">
                      <Navigation className="w-3.5 h-3.5" />Itinéraire
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="font-serif italic text-white/50 text-xl mt-3">Plus rien au programme.</p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-white/45">
              Puis <span className="text-white/30 normal-case tracking-normal font-normal ml-2">{state.done_count} sur {state.total} passés</span>
            </p>
            <ul className="mt-3 divide-y divide-white/10">
              {upcoming.map((i) => (
                <li key={i.id} className="grid grid-cols-[3.4rem_1fr] gap-x-3 py-2 text-[14px]">
                  <span className="tabular-nums text-white/55">{timeOf(i.start_at)}</span>
                  <span className="truncate text-white/85">{i.title}</span>
                </li>
              ))}
              {upcoming.length === 0 && <li className="py-2 text-[13px] text-white/35">—</li>}
            </ul>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
