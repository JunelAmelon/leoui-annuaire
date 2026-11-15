'use client';

/**
 * Panneau de personnalisation de la vue 3D :
 *  - PC : tiroir latéral droit, la salle reste visible à côté.
 *  - Mobile : feuille en bas d'écran (demi-hauteur, défilable) — on voit les changements en direct.
 * Quatre onglets en grille fixe (aucun défilement horizontal) : Sol · Mobilier · Fleurs · Salle.
 */

import { useState } from 'react';
import { X, Layers, Armchair, Flower2, Maximize2 } from 'lucide-react';
import type { DecorConfig, FloorStyle, RoomConfig } from '../../domain/types';
import { RoomShapePicker } from '../RoomShapePicker';
import { FLOOR_DEFS } from './materials';
import { CENTERPIECES, CHAIR_STYLES, TABLE_SURFACES } from './Furniture3D';

const WALL_SWATCHES = ['#F3EFE9', '#FFFFFF', '#EDE3D6', '#F6E5EA', '#E4EAE2', '#DDDAD4', '#3E363B'];
const CLOTH_SWATCHES = ['#FFFFFF', '#F7F3EE', '#F3E4DC', '#FBE8ED', '#E9EFE6', '#E4E9F1', '#2B262B'];
const FLOWER_SWATCHES = ['#FFF8F2', '#E8B4B8', '#D96B82', '#E9C9A8', '#B8C9B4', '#C9A96E'];

type Tab = 'sol' | 'mobilier' | 'fleurs' | 'salle';
const TABS: { key: Tab; label: string; Icon: typeof Layers }[] = [
  { key: 'sol',      label: 'Sol & murs', Icon: Layers },
  { key: 'mobilier', label: 'Mobilier',   Icon: Armchair },
  { key: 'fleurs',   label: 'Fleurs',     Icon: Flower2 },
  { key: 'salle',    label: 'Salle',      Icon: Maximize2 },
];

const Swatches = ({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) => (
  <div className="flex gap-2 flex-wrap">
    {colors.map((c) => {
      const active = value.toLowerCase() === c.toLowerCase();
      return (
        <button key={c} type="button" onClick={() => onPick(c)} aria-label={c}
          className={`w-8 h-8 rounded-lg border-2 transition-transform ${active ? 'border-rose-500 scale-105 shadow-sm' : 'border-stone-200 hover:border-stone-300'}`}
          style={{ background: c }} />
      );
    })}
  </div>
);

export function DecorDrawer({
  decor, room, onDecor, onRoom, onClose,
}: {
  decor: DecorConfig;
  room: RoomConfig;
  onDecor: (patch: Partial<DecorConfig>) => void;
  onRoom: (r: RoomConfig) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('sol');

  return (
    <aside
      aria-label="Personnalisation de la salle"
      className="fixed z-20 bg-white/95 backdrop-blur-md shadow-2xl border-stone-200/90 flex flex-col overflow-hidden
                 inset-x-0 bottom-0 max-h-[58vh] rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]
                 sm:inset-x-auto sm:top-14 sm:right-3 sm:bottom-3 sm:w-[340px] sm:max-h-none sm:rounded-2xl sm:border"
    >
      <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mt-2 sm:hidden" />

      {/* En-tête éditorial sans aucun overflow horizontal */}
      <div className="px-4 pt-3.5 pb-0 border-b border-stone-200/70 bg-gradient-to-b from-[#FAF7F4] to-white flex-shrink-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-[9px] font-semibold tracking-[0.14em] uppercase text-rose-500">Ambiance & décor</p>
            <h3 className="font-serif text-base text-charcoal-900 leading-tight mt-0.5">Personnaliser la salle</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="w-7 h-7 rounded-full flex items-center justify-center text-charcoal-400 hover:text-charcoal-800 hover:bg-stone-100 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-0.5 -mx-1">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button key={key} type="button" onClick={() => setTab(key)}
                className={`relative flex flex-col items-center gap-1 pt-1.5 pb-2.5 px-1 text-[11px] font-medium transition-colors ${
                  active ? 'text-rose-700 font-semibold' : 'text-charcoal-400 hover:text-charcoal-700'
                }`}>
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-rose-600' : 'text-charcoal-400'}`} />
                <span className="leading-none whitespace-nowrap">{label}</span>
                {active && <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-rose-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto subtle-scroll p-4 space-y-5">
        {tab === 'sol' && (
          <>
            <div>
              <p className="text-[11px] font-medium text-charcoal-500 mb-2">Revêtement de sol</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(FLOOR_DEFS) as FloorStyle[]).map((k) => {
                  const def = FLOOR_DEFS[k];
                  const active = decor.floor === k;
                  return (
                    <button key={k} type="button" onClick={() => onDecor({ floor: k })}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                        active ? 'border-rose-400 bg-rose-50/40' : 'border-stone-200 hover:border-stone-300'
                      }`}>
                      <span className="w-6 h-6 rounded border border-stone-300/70 shrink-0" style={{ background: def.swatch }} />
                      <span className="text-xs font-medium text-charcoal-800 leading-tight">{def.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-charcoal-500 mb-2">Teinte des murs</p>
              <Swatches colors={WALL_SWATCHES} value={decor.wall_color} onPick={(wall_color) => onDecor({ wall_color })} />
            </div>
          </>
        )}

        {tab === 'mobilier' && (
          <>
            <div>
              <p className="text-[11px] font-medium text-charcoal-500 mb-2">Style des chaises</p>
              <div className="grid grid-cols-2 gap-2">
                {CHAIR_STYLES.map((c) => {
                  const active = decor.chair_style === c.value;
                  return (
                    <button key={c.value} type="button" onClick={() => onDecor({ chair_style: c.value })}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                        active ? 'border-rose-400 bg-rose-50/40' : 'border-stone-200 hover:border-stone-300'
                      }`}>
                      <span className="w-5 h-5 rounded-full border border-stone-300 shrink-0" style={{ background: c.swatch }} />
                      <span className="text-xs font-medium text-charcoal-800 leading-tight">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-charcoal-500 mb-2">Habillage des tables</p>
              <div className="grid grid-cols-2 gap-2">
                {TABLE_SURFACES.map((s) => (
                  <button key={s.value} type="button" onClick={() => onDecor({ table_style: s.value })}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      decor.table_style === s.value ? 'border-rose-400 bg-rose-50/40 text-charcoal-900' : 'border-stone-200 text-charcoal-600 hover:border-stone-300'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {decor.table_style === 'nappe' && (
              <div>
                <p className="text-[11px] font-medium text-charcoal-500 mb-2">Couleur de nappe par défaut</p>
                <Swatches colors={CLOTH_SWATCHES} value={decor.cloth_color} onPick={(cloth_color) => onDecor({ cloth_color })} />
                <p className="text-[11px] text-charcoal-400 mt-1.5">Une couleur définie sur une table précise reste prioritaire.</p>
              </div>
            )}
          </>
        )}

        {tab === 'fleurs' && (
          <>
            <div>
              <p className="text-[11px] font-medium text-charcoal-500 mb-2">Centre de table</p>
              <div className="grid grid-cols-2 gap-2">
                {CENTERPIECES.map((c) => (
                  <button key={c.value} type="button" onClick={() => onDecor({ centerpiece: c.value })}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      decor.centerpiece === c.value ? 'border-rose-400 bg-rose-50/40 text-charcoal-900' : 'border-stone-200 text-charcoal-600 hover:border-stone-300'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {decor.centerpiece !== 'aucun' && decor.centerpiece !== 'bougeoirs' && (
              <div>
                <p className="text-[11px] font-medium text-charcoal-500 mb-2">Teinte des fleurs & serviettes</p>
                <Swatches colors={FLOWER_SWATCHES} value={decor.flower_color} onPick={(flower_color) => onDecor({ flower_color })} />
              </div>
            )}
          </>
        )}

        {tab === 'salle' && <RoomShapePicker value={room} onChange={onRoom} />}
      </div>
    </aside>
  );
}
