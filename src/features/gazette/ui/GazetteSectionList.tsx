'use client';

/** Liste ordonnée des rubriques : numéro en Bodoni, type en petites capitales, actions discrètes. */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import type { GazetteSection, GazetteSectionType } from '../domain/types';

interface GazetteSectionListProps {
  sections: GazetteSection[];
  onEditSection: (section: GazetteSection) => void;
  onDeleteSection: (sectionId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddSection: (type: GazetteSectionType) => void;
}

const SECTION_TYPES: Record<GazetteSectionType, { label: string; hint: string; color: string }> = {
  story: { label: 'Histoire', hint: 'Votre rencontre, en quelques dates', color: '#BE123C' },
  anecdote: { label: 'Confidences', hint: 'Chiffres et petites histoires', color: '#B45309' },
  quiz: { label: 'Quiz', hint: 'Des questions pour les invités', color: '#4D7C0F' },
  program: { label: 'Programme', hint: 'Les horaires de la journée', color: '#1E3A8A' },
  custom: { label: 'Tribune', hint: 'Un mot libre, des remerciements', color: '#6D28D9' },
};

const MAX = 30;

export function GazetteSectionList({ sections, onEditSection, onDeleteSection, onMoveUp, onMoveDown, onAddSection }: GazetteSectionListProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const iconBtn = 'w-9 h-9 flex items-center justify-center text-charcoal-400 hover:text-rose-600 disabled:opacity-20 disabled:hover:text-charcoal-400 transition-colors';

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 border-b border-charcoal-200/70">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-rose-600">Sommaire</p>
          <h2 className="font-serif text-charcoal-900 mt-2 leading-none" style={{ fontSize: '1.9rem', fontWeight: 400 }}>
            {sections.length} rubrique{sections.length > 1 ? 's' : ''} <span className="text-charcoal-300 text-xl">sur {MAX}</span>
          </h2>
        </div>

        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} disabled={sections.length >= MAX}
            className="inline-flex items-center gap-2 h-11 px-5 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-40 transition-colors rounded-sm">
            <Plus className="w-4 h-4" /> Ajouter une rubrique
          </button>
          {menuOpen && (
            <>
              <button type="button" aria-label="Fermer" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
              <ul className="absolute right-0 top-full mt-2 z-20 w-72 max-w-[85vw] bg-white border border-stone-200 shadow-xl py-1.5">
                {(Object.keys(SECTION_TYPES) as GazetteSectionType[]).map((type) => (
                  <li key={type}>
                    <button type="button" onClick={() => { onAddSection(type); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 hover:bg-[#FBF8F4] transition-colors">
                      <span className="block font-serif text-[1.05rem] text-charcoal-900 leading-tight">{SECTION_TYPES[type].label}</span>
                      <span className="block text-[12px] text-charcoal-400 mt-0.5">{SECTION_TYPES[type].hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <ol>
        {sections.map((section, index) => {
          const conf = SECTION_TYPES[section.type] ?? SECTION_TYPES.custom;
          return (
            <li key={section.id} className="group grid grid-cols-[2.4rem_1fr_auto] sm:grid-cols-[3.4rem_1fr_auto] items-center gap-x-3 sm:gap-x-5 py-5 border-b border-charcoal-100 hover:bg-[#FBF8F4] -mx-3 px-3 transition-colors">
              <span className="text-[1.6rem] sm:text-[2rem] leading-none tabular-nums text-charcoal-300 group-hover:text-rose-500 transition-colors" style={{ fontFamily: "'Bodoni Moda', 'Didot', serif" }}>{index + 1}</span>
              <button type="button" onClick={() => onEditSection(section)} className="min-w-0 text-left">
                <span className="block text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: conf.color }}>{conf.label}</span>
                <span className="block font-serif text-charcoal-900 text-[1.1rem] sm:text-[1.2rem] leading-snug mt-0.5 break-words group-hover:text-rose-700 transition-colors" style={{ fontWeight: 500 }}>{section.title}</span>
              </button>
              <div className="flex items-center">
                <button type="button" disabled={index === 0} onClick={() => onMoveUp(index)} className={iconBtn} aria-label="Monter"><ChevronUp className="w-4 h-4" /></button>
                <button type="button" disabled={index === sections.length - 1} onClick={() => onMoveDown(index)} className={iconBtn} aria-label="Descendre"><ChevronDown className="w-4 h-4" /></button>
                <button type="button" onClick={() => onEditSection(section)} className={`${iconBtn} hidden sm:flex`} aria-label="Modifier"><Pencil className="w-4 h-4" /></button>
                <button type="button" onClick={() => onDeleteSection(section.id)} className={iconBtn} aria-label="Supprimer"><Trash2 className="w-4 h-4" /></button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
