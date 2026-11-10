'use client';

/**
 * Assistant de configuration de la salle — s'ouvre au premier lancement.
 * Layout split : image mariage à gauche, parcours 4 étapes à droite.
 * Génération déléguée au service (SRP) — ce composant ne fait que collecter.
 */

import { useState } from 'react';
import { X, Users, ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import type { RoomItemType, TableShape } from '../domain/types';
import { TABLE_SHAPES } from '../domain/types';
import { ROOM_ITEM_DEFS } from '../services/seating.service';
import { ITEM_ICONS } from './item-icons';

const STEPS = ['Vos invités', 'Votre salle', 'Vos tables', 'Récapitulatif'] as const;

const ITEM_CHOICES: { type: RoomItemType; hint: string }[] = [
  { type: 'stage', hint: "Table des mariés sur scène" },
  { type: 'dancefloor', hint: 'Parquet dédié aux danses' },
  { type: 'dj', hint: 'DJ / orchestre' },
  { type: 'buffet', hint: 'Table de service traiteur' },
  { type: 'bar', hint: 'Comptoir boissons' },
  { type: 'photobooth', hint: 'Borne photos invités' },
  { type: 'entrance', hint: 'Entrée principale' },
];

/** Aperçu "mini plan de table" — la table entourée de ses chaises. */
const ShapePreview = ({ shape }: { shape: TableShape }) => {
  const dots = (pts: [number, number][]) =>
    pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#B4A79C" />);
  return (
    <svg viewBox="0 0 64 46" className="w-16 h-12 mx-auto mb-2">
      {shape === 'round' && (
        <>
          {dots([[32,4],[18,9],[46,9],[13,20],[51,20],[18,31],[46,31],[32,36]])}
          <circle cx="32" cy="20" r="11" fill="#57534E" />
        </>
      )}
      {shape === 'rect' && (
        <>
          {dots([[19,4],[29,4],[39,4],[19,38],[29,38],[39,38]])}
          <rect x="10" y="11" width="38" height="22" rx="4" fill="#57534E" />
        </>
      )}
      {shape === 'oval' && (
        <>
          {dots([[20,5],[44,5],[12,14],[52,14],[12,28],[52,28],[20,37],[44,37]])}
          <ellipse cx="32" cy="21" rx="19" ry="10" fill="#57534E" />
        </>
      )}
      {shape === 'head' && (
        <>
          {dots([[14,32],[24,32],[34,32],[44,32],[54,32]])}
          <rect x="8" y="12" width="52" height="11" rx="4" fill="#57534E" />
        </>
      )}
    </svg>
  );
};

export function SetupWizard({
  guestCount,
  onGenerate,
  onClose,
  isEdit = false,
}: {
  guestCount: number;
  onGenerate: (opts: { tableCount: number; shape: TableShape; seats: number; roomItems: RoomItemType[] }) => void;
  onClose: () => void;
  isEdit?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState<number>(Math.max(10, guestCount));
  const [items, setItems] = useState<RoomItemType[]>(['dancefloor', 'bar']);
  const [shape, setShape] = useState<TableShape>('round');
  const [seats, setSeats] = useState(8);
  const [extra, setExtra] = useState(0);

  const suggested = Math.ceil(guests / Math.max(1, seats));
  const tableCount = Math.max(1, suggested + extra);
  const capacity = tableCount * seats;

  const toggle = (t: RoomItemType) =>
    setItems((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-charcoal-950/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col sm:flex-row overflow-hidden">
        {/* ── Colonne image ── */}
        <div className="relative sm:w-[42%] h-28 sm:h-auto flex-shrink-0">
          <img src="/mariage%20(4).jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#2A1A1E]/80 via-[#2A1A1E]/45 to-[#2A1A1E]/25" />
          <div className="absolute inset-0 flex items-end p-5">
            <div>
              <p className="label-xs text-rose-200 tracking-[0.12em] mb-1">Plan de table</p>
              <h2 className="font-serif text-xl sm:text-2xl text-white leading-snug">
                {isEdit ? 'Modifier votre salle' : 'Créez votre salle en 1 minute'}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="absolute top-4 right-4 sm:hidden w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Colonne contenu ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Header étapes */}
          <div className="px-6 pt-5 pb-3 border-b border-stone-100 flex-shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs text-charcoal-500">
                {isEdit ? 'La régénération recrée la salle (vos invités sont conservés).' : `Étape ${step + 1} sur ${STEPS.length} — ${STEPS[step]}`}
              </p>
              <button type="button" onClick={onClose} aria-label="Fermer"
                className="hidden sm:flex w-8 h-8 rounded-full bg-[#FAF6F2] hover:bg-stone-100 items-center justify-center text-charcoal-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-rose-600' : 'bg-stone-100'}`} />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 0 && (
              <div className="space-y-5">
                <p className="text-sm text-charcoal-500 leading-relaxed">
                  Combien d'invités seront présents ? Nous dimensionnons la salle en fonction.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button type="button" onClick={() => setGuests((g) => Math.max(10, g - 10))}
                    className="w-10 h-10 rounded-full bg-[#FAF6F2] border border-stone-200 text-charcoal-700 text-lg font-bold hover:border-rose-400">−</button>
                  <input type="number" min={2} max={600} value={guests}
                    onChange={(e) => setGuests(Math.max(2, Number(e.target.value) || 2))}
                    className="w-28 text-center font-serif text-3xl text-charcoal-900 border-b-2 border-rose-500 focus:outline-none bg-transparent" />
                  <button type="button" onClick={() => setGuests((g) => g + 10)}
                    className="w-10 h-10 rounded-full bg-[#FAF6F2] border border-stone-200 text-charcoal-700 text-lg font-bold hover:border-rose-400">+</button>
                </div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {[40, 60, 80, 100, 150, 200].map((n) => (
                    <button key={n} type="button" onClick={() => setGuests(n)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${guests === n ? 'bg-charcoal-900 text-white' : 'bg-white text-charcoal-500 border border-stone-200'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-charcoal-500 flex items-center justify-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> {guests} invités
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-charcoal-500">
                  Quels éléments votre salle comportera-t-elle ? Ils seront placés automatiquement, puis réglables.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {ITEM_CHOICES.map(({ type, hint }) => {
                    const active = items.includes(type);
                    return (
                      <button key={type} type="button" onClick={() => toggle(type)}
                        className={`relative flex flex-col items-center gap-1.5 px-3 pt-4 pb-7 rounded-lg border text-center transition-colors ${active ? 'border-rose-400 bg-white' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                        <span className="flex items-center justify-center">
                          {ITEM_ICONS[type]}
                        </span>
                        <span className={`text-[12px] font-semibold leading-tight ${active ? 'text-charcoal-900' : 'text-charcoal-600'}`}>{ROOM_ITEM_DEFS[type].label}</span>
                        <span className="text-[10px] text-charcoal-400 leading-tight">{hint}</span>
                        {/* Badge de sélection — bas de tuile */}
                        <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full flex items-center justify-center transition-colors ${active ? 'bg-rose-600 text-white' : 'border border-stone-300'}`}>
                          {active && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <p className="text-sm text-charcoal-500">Choisissez la forme de vos tables.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {TABLE_SHAPES.map(({ value, label }) => (
                    <button key={value} type="button" onClick={() => setShape(value)}
                      className={`rounded-lg border p-3.5 transition-colors ${shape === value ? 'border-rose-400 bg-rose-50/40' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                      <ShapePreview shape={value} />
                      <p className="text-[13px] font-semibold text-charcoal-900 text-center">{label}</p>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-sm text-charcoal-500 mb-2">Places par table : <strong className="text-charcoal-900">{seats}</strong></p>
                  <div className="flex gap-1.5">
                    {[4, 6, 8, 10, 12].map((n) => (
                      <button key={n} type="button" onClick={() => setSeats(n)}
                        className={`flex-1 h-10 rounded-lg text-[13px] font-semibold transition-colors ${seats === n ? 'bg-charcoal-900 text-white' : 'bg-white border border-stone-200 text-charcoal-700'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-[#FAF6F2] border border-stone-200 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-charcoal-900">Nombre de tables</p>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setExtra((e) => e - 1)}
                        className="w-7 h-7 rounded-full bg-white border border-stone-200 text-charcoal-700 font-bold">−</button>
                      <span className="text-lg font-bold text-charcoal-900 w-8 text-center">{tableCount}</span>
                      <button type="button" onClick={() => setExtra((e) => e + 1)}
                        className="w-7 h-7 rounded-full bg-white border border-stone-200 text-charcoal-700 font-bold">+</button>
                    </div>
                  </div>
                  <p className="text-[11.5px] text-charcoal-500">
                    Suggestion : {suggested} table{suggested > 1 ? 's' : ''} pour {guests} invités
                    → {capacity} places{capacity < guests ? ` (il manque ${guests - capacity} places)` : ''}
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-charcoal-500">Voici ce que nous allons générer :</p>
                <div className="rounded-2xl bg-[#FAF6F2] border border-stone-200 divide-y divide-stone-200">
                  {[
                    ['Invités', `${guests} personnes`],
                    ['Tables', `${tableCount} tables ${TABLE_SHAPES.find((s) => s.value === shape)?.label.toLowerCase()}s de ${seats} places`],
                    ['Éléments', items.length ? items.map((t) => ROOM_ITEM_DEFS[t].label).join(', ') : 'Aucun'],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between items-start px-4 py-3">
                      <span className="text-xs font-semibold text-charcoal-400">{l}</span>
                      <span className="text-xs font-medium text-charcoal-900 text-right max-w-[60%]">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-charcoal-500 leading-relaxed flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  Tout reste modifiable ensuite : positions, rotations, noms de tables, invités.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-stone-100 flex justify-between gap-3 flex-shrink-0">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold text-charcoal-500 hover:text-charcoal-900 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-charcoal-900 text-white text-xs font-semibold shadow hover:bg-charcoal-800">
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={() => onGenerate({ tableCount, shape, seats, roomItems: items })}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700">
                <Sparkles className="w-4 h-4" /> {isEdit ? 'Régénérer ma salle' : 'Générer ma salle'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
