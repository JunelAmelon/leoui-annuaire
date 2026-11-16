'use client';

/** Création / modification d'un moment. Plein écran sur mobile, fenêtre centrée au-delà. */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import {
  CATEGORIES, CATEGORY_KEYS, DAY_KEYS, DAY_LABELS, LIMITS,
  type DayKey, type TimelineItem, type TimelineItemInput, type VendorLink,
} from '../domain/types';
import { NIGHT_CUTOFF_HOUR, isValidTime, timeOf } from '../domain/timeline';

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

const field = 'w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none';
const label = 'block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400';

const emptyInput = (): TimelineItemInput => ({
  title: '', time: '14:00', duration_min: 60, category: 'ceremony',
  location_name: '', location_address: '', travel_min: 0, people: [], notes: '', vendor_ids: [],
});

const toInput = (item: TimelineItem): TimelineItemInput => ({
  title: item.title,
  time: timeOf(item.start_at),
  duration_min: item.duration_min,
  category: item.category,
  location_name: item.location.name,
  location_address: item.location.address,
  travel_min: item.location.travel_min,
  people: item.people,
  notes: item.notes,
  vendor_ids: item.vendor_ids,
});

interface ItemModalProps {
  /** Moment à modifier ; absent = création. */
  item?: TimelineItem;
  dayKey: DayKey;
  vendors: VendorLink[];
  /** Lieux déjà saisis, proposés à la frappe. */
  knownPlaces: string[];
  saving: boolean;
  errors?: Record<string, string>;
  onSave: (input: TimelineItemInput, targetKey: DayKey) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function ItemModal({ item, dayKey, vendors, knownPlaces, saving, errors = {}, onSave, onDelete, onClose }: ItemModalProps) {
  const [input, setInput] = useState<TimelineItemInput>(() => (item ? toInput(item) : emptyInput()));
  const [key, setKey] = useState<DayKey>(dayKey);
  const [people, setPeople] = useState(() => (item ? item.people.join(', ') : ''));
  const set = <K extends keyof TimelineItemInput>(k: K, v: TimelineItemInput[K]) => setInput((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const night = isValidTime(input.time) && Number(input.time.slice(0, 2)) < NIGHT_CUTOFF_HOUR;
  const activeVendors = vendors.filter((v) => !v.token_revoked_at || input.vendor_ids.includes(v.vendor_id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...input, people: people.split(',').map((p) => p.trim()).filter(Boolean) }, key);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-charcoal-950/55 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[92dvh] flex flex-col sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-5 border-b border-stone-200 flex-shrink-0">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Planning du jour J</p>
            <h2 className="font-serif text-charcoal-900 text-[1.7rem] leading-tight mt-1" style={{ fontWeight: 400 }}>{item ? 'Modifier le moment' : 'Nouveau moment'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 -mr-2 flex items-center justify-center text-charcoal-400 hover:text-charcoal-900"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain subtle-scroll px-6 sm:px-8 py-6 space-y-7">
          <label className="block">
            <span className={label}>Intitulé</span>
            <input autoFocus={!item} value={input.title} maxLength={LIMITS.TITLE} onChange={(e) => set('title', e.target.value)} placeholder="Ex : Cérémonie laïque" className={`${field} font-serif text-xl`} />
            {errors.title && <span className="block text-[12px] text-rose-600 mt-1">{errors.title}</span>}
          </label>

          <div>
            <span className={label}>Journée</span>
            <div className="flex gap-x-6 mt-2.5">
              {DAY_KEYS.map((k) => (
                <button key={k} type="button" onClick={() => setKey(k)}
                  className={`pb-1 border-b-2 text-[14px] transition-colors ${key === k ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'}`}>{DAY_LABELS[k]}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6">
            <label className="block">
              <span className={label}>Heure de début</span>
              <input type="time" required value={input.time} onChange={(e) => set('time', e.target.value)} className={`${field} tabular-nums`} />
              {errors.time && <span className="block text-[12px] text-rose-600 mt-1">{errors.time}</span>}
            </label>
            <label className="block">
              <span className={label}>Durée (minutes)</span>
              <input type="number" inputMode="numeric" min={0} max={1440} step={5} value={input.duration_min} onChange={(e) => set('duration_min', Number(e.target.value))} className={`${field} tabular-nums`} />
            </label>
            <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
              {DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => set('duration_min', d)}
                  className={`text-[12.5px] tabular-nums ${input.duration_min === d ? 'text-rose-600 font-medium' : 'text-charcoal-400 hover:text-charcoal-800'}`}>{d < 60 ? `${d} min` : d % 60 ? `${Math.floor(d / 60)} h ${d % 60}` : `${d / 60} h`}</button>
              ))}
            </div>
            {night && <p className="col-span-2 text-[12.5px] text-charcoal-500 mt-2.5 border-l-2 border-rose-500 pl-3">Avant {NIGHT_CUTOFF_HOUR} h : ce moment sera rangé après minuit, à la fin de « {DAY_LABELS[key].toLowerCase()} ».</p>}
          </div>

          <div>
            <span className={label}>Catégorie</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {CATEGORY_KEYS.map((c) => {
                const active = input.category === c;
                return (
                  <button key={c} type="button" onClick={() => set('category', c)}
                    className={`inline-flex items-center gap-2 h-9 px-3 border text-[13px] transition-colors rounded-sm ${active ? 'border-charcoal-900 text-charcoal-900 bg-[#FBF8F4]' : 'border-stone-200 text-charcoal-500 hover:border-stone-400'}`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORIES[c].color }} />{CATEGORIES[c].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-[1fr_9rem] gap-x-6 gap-y-7">
            <label className="block">
              <span className={label}>Lieu</span>
              <input list="day-plan-places" value={input.location_name} onChange={(e) => set('location_name', e.target.value)} placeholder="Ex : Château de la Mariée" className={field} />
              <datalist id="day-plan-places">{knownPlaces.map((p) => <option key={p} value={p} />)}</datalist>
            </label>
            <label className="block">
              <span className={label}>Trajet (min)</span>
              <input type="number" inputMode="numeric" min={0} max={600} step={5} value={input.travel_min} onChange={(e) => set('travel_min', Number(e.target.value))} className={`${field} tabular-nums`} />
            </label>
            <p className="sm:col-span-2 -mt-4 text-[12px] text-charcoal-400">Le trajet est le temps pour arriver ici depuis le lieu du moment précédent. Il sert à vous alerter si l’enchaînement est trop serré.</p>
            <label className="block sm:col-span-2">
              <span className={label}>Adresse</span>
              <input value={input.location_address} onChange={(e) => set('location_address', e.target.value)} placeholder="Facultatif" className={field} />
            </label>
          </div>

          <label className="block">
            <span className={label}>Personnes concernées</span>
            <input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Séparées par des virgules : Sophie, les témoins…" className={field} />
          </label>

          {activeVendors.length > 0 && (
            <div>
              <span className={label}>Prestataires présents</span>
              <div className="flex flex-wrap gap-2 mt-3">
                {activeVendors.map((v) => {
                  const on = input.vendor_ids.includes(v.vendor_id);
                  return (
                    <button key={v.vendor_id} type="button" aria-pressed={on}
                      onClick={() => set('vendor_ids', on ? input.vendor_ids.filter((id) => id !== v.vendor_id) : [...input.vendor_ids, v.vendor_id])}
                      className={`h-9 px-3 border text-[13px] transition-colors rounded-sm ${on ? 'border-charcoal-900 bg-charcoal-900 text-white' : 'border-stone-200 text-charcoal-600 hover:border-stone-400'}`}>{v.label}</button>
                  );
                })}
              </div>
            </div>
          )}

          <label className="block">
            <span className={label}>Notes</span>
            <textarea rows={3} value={input.notes} maxLength={LIMITS.NOTES} onChange={(e) => set('notes', e.target.value)} placeholder="Ce qu’il ne faut pas oublier. Visible par les prestataires, pas par le lien général."
              className={`${field} resize-none font-serif italic text-[16px] leading-relaxed`} />
          </label>
        </div>

        <div className="flex items-center gap-3 px-6 sm:px-8 py-4 border-t border-stone-200 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {onDelete && (
            <button type="button" onClick={onDelete} disabled={saving} className="inline-flex items-center gap-1.5 text-[13px] text-charcoal-500 hover:text-rose-600 disabled:opacity-40 mr-auto">
              <Trash2 className="w-4 h-4" /> Supprimer
            </button>
          )}
          <button type="button" onClick={onClose} className={`h-11 px-5 border border-stone-300 text-charcoal-700 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm ${onDelete ? '' : 'ml-auto'}`}>Annuler</button>
          <button type="submit" disabled={saving || !input.title.trim()}
            className="h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-35 disabled:hover:bg-charcoal-900 transition-colors rounded-sm">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
