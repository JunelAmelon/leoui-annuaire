'use client';

/**
 * Chronologie verticale d'une journée : heure à gauche, rail coloré par catégorie, contenu à droite.
 * Composant de présentation pur, partagé par l'espace du couple et le lien prestataire.
 */

import type { ReactNode } from 'react';
import { AlertTriangle, Clock, MapPin, Navigation, Pencil, Users } from 'lucide-react';
import { CATEGORIES, type DayBlock, type TimelineItem } from '../domain/types';
import {
  directionsUrl, endOf, formatDuration, isAfterMidnight, minutesBetween, sortItems, timeOf, type TimelineAlert,
} from '../domain/timeline';

const NUMERAL = "'Bodoni Moda', 'Didot', serif";

const ALERT_STYLE: Record<TimelineAlert['level'], { bar: string; text: string; label: string }> = {
  danger: { bar: 'border-rose-600 bg-rose-50/70', text: 'text-rose-800', label: 'Trajet impossible' },
  warning: { bar: 'border-amber-500 bg-amber-50/70', text: 'text-amber-900', label: 'À surveiller' },
  info: { bar: 'border-stone-300 bg-stone-50', text: 'text-charcoal-600', label: 'À compléter' },
};

interface TimelineProps {
  block: DayBlock;
  alerts?: TimelineAlert[];
  /** Libellés des intervenants, par identifiant. */
  vendorLabels?: Record<string, string>;
  /** Met en avant les moments de cet intervenant et atténue les autres. */
  highlightVendorId?: string;
  onEdit?: (item: TimelineItem) => void;
  /** Résout une alerte en décalant le moment (`cascade` : la suite suit). */
  onShift?: (alert: TimelineAlert, cascade: boolean) => void;
  /** Contenu libre sous un moment (ex. bouton « Proposer un autre horaire »). */
  renderExtra?: (item: TimelineItem) => ReactNode;
  busy?: boolean;
}

export function Timeline({ block, alerts = [], vendorLabels = {}, highlightVendorId, onEdit, onShift, renderExtra, busy }: TimelineProps) {
  const items = sortItems(block.items);
  const alertByItem = new Map(alerts.map((a) => [a.item_id, a]));

  return (
    <ol className="relative">
      {items.map((item, index) => {
        const cat = CATEGORIES[item.category] ?? CATEGORIES.other;
        const prev = items[index - 1];
        const gap = prev ? minutesBetween(endOf(prev), item.start_at) : 0;
        const alert = alertByItem.get(item.id);
        const late = isAfterMidnight(item, block.date);
        const mine = highlightVendorId ? item.vendor_ids.includes(highlightVendorId) : true;
        const vendors = item.vendor_ids.map((id) => vendorLabels[id]).filter(Boolean);
        const last = index === items.length - 1;

        return (
          <li key={item.id}>
            {/* Entre deux moments : alerte ou simple battement */}
            {prev && (alert || gap >= 15) && (
              <div className="grid grid-cols-[3.4rem_1.25rem_1fr] sm:grid-cols-[6rem_2rem_1fr]">
                <span />
                <span className="flex justify-center"><span className="w-px bg-stone-200" /></span>
                <div className="pb-5">
                  {alert ? (
                    <div className={`border-l-2 px-4 py-3 ${ALERT_STYLE[alert.level].bar}`}>
                      <p className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] uppercase ${ALERT_STYLE[alert.level].text}`}>
                        {alert.level !== 'info' && <AlertTriangle className="w-3 h-3" />}
                        {alert.kind === 'overlap' ? 'Chevauchement' : alert.kind === 'travel_tight' ? 'Trajet serré' : ALERT_STYLE[alert.level].label}
                      </p>
                      <p className="text-[13.5px] text-charcoal-800 mt-1 leading-relaxed">{alert.message}</p>
                      {onShift && alert.missing_min > 0 && (
                        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2.5">
                          <button type="button" disabled={busy} onClick={() => onShift(alert, true)}
                            className="text-[13px] font-medium text-charcoal-900 border-b border-charcoal-900 pb-px hover:text-rose-600 hover:border-rose-600 disabled:opacity-40 transition-colors">
                            Décaler de {formatDuration(alert.missing_min)}, et toute la suite
                          </button>
                          <button type="button" disabled={busy} onClick={() => onShift(alert, false)}
                            className="text-[13px] text-charcoal-500 hover:text-charcoal-900 disabled:opacity-40 transition-colors">
                            Seulement ce moment
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-charcoal-400 tracking-wide">{formatDuration(gap)} de battement</p>
                  )}
                </div>
              </div>
            )}

            <div className={`group grid grid-cols-[3.4rem_1.25rem_1fr] sm:grid-cols-[6rem_2rem_1fr] transition-opacity ${mine ? '' : 'opacity-45'}`}>
              {/* Heure */}
              <div className="text-right pr-1 sm:pr-3">
                <p className="text-[1.25rem] sm:text-[1.9rem] leading-none tabular-nums text-charcoal-900" style={{ fontFamily: NUMERAL }}>{timeOf(item.start_at)}</p>
                {item.duration_min > 0 && <p className="text-[10.5px] sm:text-[11px] text-charcoal-400 tabular-nums mt-1.5">{timeOf(endOf(item))}</p>}
                {late && <p className="text-[8.5px] sm:text-[9px] font-semibold tracking-[0.14em] uppercase text-rose-600 mt-1">Après minuit</p>}
              </div>

              {/* Rail */}
              <div className="relative flex justify-center">
                <span className={`absolute top-0 w-px bg-stone-200 ${last ? 'h-3' : 'bottom-0'}`} />
                <span className="relative mt-1.5 sm:mt-2.5 w-[11px] h-[11px] rounded-full ring-4 ring-white" style={{ backgroundColor: cat.color }} />
              </div>

              {/* Contenu */}
              <div className={`min-w-0 ${last ? 'pb-2' : 'pb-7'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: cat.color }}>{cat.label}</p>
                    <h3 className="font-serif text-charcoal-900 text-[1.2rem] sm:text-[1.4rem] leading-snug mt-0.5 break-words" style={{ fontWeight: 500 }}>{item.title}</h3>
                  </div>
                  {onEdit && (
                    <button type="button" onClick={() => onEdit(item)} aria-label={`Modifier ${item.title}`}
                      className="flex-shrink-0 p-2 -mr-2 text-charcoal-400 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-[13px] text-charcoal-500">
                  {item.duration_min > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-charcoal-300" />{formatDuration(item.duration_min)}</span>}
                  {item.location.name && (
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-charcoal-300 flex-shrink-0" />
                      <span className="truncate">{item.location.name}{item.location.travel_min > 0 ? ` · ${item.location.travel_min} min de trajet` : ''}</span>
                    </span>
                  )}
                  {item.people.length > 0 && <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-charcoal-300" />{item.people.join(', ')}</span>}
                </div>

                {item.location.address && <p className="text-[12.5px] text-charcoal-400 mt-1">{item.location.address}</p>}
                {directionsUrl(item.location) && (
                  <a href={directionsUrl(item.location)!} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1.5 text-[12.5px] font-medium text-rose-600 hover:text-rose-700 border-b border-rose-200 hover:border-rose-600 pb-px transition-colors">
                    <Navigation className="w-3.5 h-3.5" />Itinéraire
                  </a>
                )}
                {item.notes && <p className="font-serif italic text-charcoal-600 text-[15px] leading-relaxed mt-2 whitespace-pre-line">{item.notes}</p>}
                {vendors.length > 0 && (
                  <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-charcoal-400 mt-2.5">
                    Avec <span className="text-charcoal-700">{vendors.join(' · ')}</span>
                  </p>
                )}
                {renderExtra?.(item)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
