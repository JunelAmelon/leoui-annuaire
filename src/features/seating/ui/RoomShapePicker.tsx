'use client';

/**
 * Choix de la forme + dimensions de la salle — composant de saisie pur
 * (aucune persistance : l'appelant décide quand sauvegarder). Réutilisé dans
 * l'assistant et dans le panneau « Salle » du plan.
 */

import type { RoomConfig, RoomShape } from '../domain/types';
import { ROOM_SHAPES, ROOM_LIMITS } from '../domain/types';
import { normalizeRoom, roomPolygonMeters, polygonArea } from '../domain/room-geometry';

/** Silhouette de la salle, normalisée dans une vignette 56×40. */
function ShapeThumb({ shape, active }: { shape: RoomShape; active: boolean }) {
  const poly = roomPolygonMeters({ shape, width_m: 28, length_m: shape === 'square' ? 28 : 20 });
  const maxX = Math.max(...poly.map((p) => p.x));
  const maxY = Math.max(...poly.map((p) => p.y));
  const k = Math.min(48 / maxX, 32 / maxY);
  const ox = (56 - maxX * k) / 2;
  const oy = (40 - maxY * k) / 2;
  const pts = poly.map((p) => `${(ox + p.x * k).toFixed(1)},${(oy + p.y * k).toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 56 40" className="w-14 h-10" aria-hidden>
      <polygon points={pts} fill={active ? '#FBE8ED' : '#F1ECE6'} stroke={active ? '#E11D48' : '#B4A79C'} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function RoomShapePicker({ value, onChange }: { value: RoomConfig; onChange: (r: RoomConfig) => void }) {
  const room = normalizeRoom(value);
  const set = (patch: Partial<RoomConfig>) => onChange(normalizeRoom({ ...room, ...patch }));
  const area = Math.round(polygonArea(roomPolygonMeters(room)));

  // Fonction de rendu (pas un composant) : évite le remontage du <input> pendant le glissement
  const slider = (label: string, field: 'width_m' | 'length_m', disabled?: boolean) => (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-charcoal-500">{label}</span>
        <span className="text-sm font-semibold text-charcoal-900 tabular-nums">{room[field]} m</span>
      </div>
      <input
        type="range" min={ROOM_LIMITS.min_m} max={ROOM_LIMITS.max_m} step={0.5}
        value={room[field]} disabled={disabled}
        onChange={(e) => set({ [field]: Number(e.target.value) })}
        className="w-full accent-rose-600 h-1.5"
        aria-label={label}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {ROOM_SHAPES.map(({ value: v, label }) => {
          const active = room.shape === v;
          return (
            <button key={v} type="button" onClick={() => set({ shape: v })} aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-lg border py-2.5 transition-colors ${
                active ? 'border-rose-400 bg-rose-50/40' : 'border-stone-200 bg-white hover:border-stone-300'
              }`}>
              <ShapeThumb shape={v} active={active} />
              <span className={`text-[11px] font-semibold ${active ? 'text-charcoal-900' : 'text-charcoal-500'}`}>{label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3.5">
        {slider(room.shape === 'square' ? 'Côté' : 'Largeur', 'width_m')}
        {slider('Longueur', 'length_m', room.shape === 'square')}
      </div>

      <p className="text-[11px] text-charcoal-400">
        Surface au sol ≈ <strong className="text-charcoal-700">{area} m²</strong>
        {room.shape !== 'rect' && room.shape !== 'square' ? ' (hors zones vides de la forme)' : ''}
      </p>
    </div>
  );
}
