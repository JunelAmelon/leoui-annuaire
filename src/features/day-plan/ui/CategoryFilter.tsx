'use client';

/** Filtre de la chronologie par catégorie : onglets de texte sur un filet, pictogramme fin + intitulé + effectif en exposant. */

import { CATEGORIES, type TimelineCategory } from '../domain/types';
import { CATEGORY_ICONS } from './category-icons';

interface CategoryFilterProps {
  /** Catégories présentes dans la journée, avec leur effectif. */
  counts: { category: TimelineCategory; count: number }[];
  total: number;
  value: TimelineCategory | null;
  onChange: (value: TimelineCategory | null) => void;
}

export function CategoryFilter({ counts, total, value, onChange }: CategoryFilterProps) {
  const tab = (active: boolean) =>
    `relative inline-flex items-center gap-2 whitespace-nowrap py-3 text-[13.5px] transition-colors ${active ? 'text-charcoal-900 font-medium' : 'text-charcoal-400 hover:text-charcoal-800'}`;
  const count = 'text-[10px] tabular-nums font-normal text-charcoal-400 -translate-y-1.5';
  const bar = (color: string, active: boolean) => (
    <span className="absolute inset-x-0 -bottom-px h-[2px] transition-opacity" style={{ backgroundColor: color, opacity: active ? 1 : 0 }} />
  );

  return (
    <div role="tablist" aria-label="Filtrer par catégorie" className="flex gap-x-7 overflow-x-auto subtle-scroll border-b border-stone-200">
      <button type="button" role="tab" aria-selected={!value} onClick={() => onChange(null)} className={tab(!value)}>
        Tout<span className={count}>{total}</span>{bar('#1C1614', !value)}
      </button>
      {counts.map(({ category, count: n }) => {
        const Icon = CATEGORY_ICONS[category];
        const { color, label } = CATEGORIES[category];
        const active = value === category;
        return (
          <button key={category} type="button" role="tab" aria-selected={active} onClick={() => onChange(active ? null : category)} className={tab(active)}>
            <Icon className="w-4 h-4" strokeWidth={1.4} style={{ color: active ? color : '#B8AFA6' }} />
            {label}<span className={count}>{n}</span>{bar(color, active)}
          </button>
        );
      })}
    </div>
  );
}
