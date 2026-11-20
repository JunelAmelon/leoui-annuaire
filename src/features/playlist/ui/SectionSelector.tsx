'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DayPlanMomentRef, PlaylistSection, PlaylistTrack } from '../domain/types';
import { formatMomentTime } from '../domain/playlist-rules';

interface SectionSelectorProps {
  sections: PlaylistSection[];
  activeSectionId: string;
  tracks: PlaylistTrack[];
  moments: DayPlanMomentRef[];
  busy?: boolean;
  onSelectSection: (sectionId: string) => void;
  onAddSection: (label: string, linkedMomentId?: string | null) => Promise<boolean>;
  onRemoveSection: (sectionId: string) => Promise<boolean>;
  onLinkMoment: (sectionId: string, momentId: string | null) => Promise<boolean>;
}

export function SectionSelector({
  sections,
  activeSectionId,
  tracks,
  moments,
  busy,
  onSelectSection,
  onAddSection,
  onRemoveSection,
  onLinkMoment,
}: SectionSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedMomentId, setSelectedMomentId] = useState<string>('');

  const momentsMap = new Map(moments.map((m) => [m.id, m]));

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const ok = await onAddSection(newLabel.trim(), selectedMomentId || null);
    if (ok) {
      setNewLabel('');
      setSelectedMomentId('');
      setIsAdding(false);
    }
  };

  return (
    <nav aria-label="Moments musicaux" className="space-y-4">
      <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
        <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-stone-500">
          MOMENTS DU MARIAGE
        </span>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase text-rose-700 hover:text-rose-900 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>AJOUTER UN MOMENT</span>
        </button>
      </div>

      {/* Formulaire d'ajout d'un nouveau moment */}
      {isAdding && (
        <form
          onSubmit={handleAddSubmit}
          className="p-3 bg-white border border-stone-200 space-y-3 animate-fade-in"
        >
          <div className="space-y-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex : Lancer du bouquet, Vœux..."
              maxLength={80}
              autoFocus
              className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-rose-600"
            />
            {moments.length > 0 && (
              <select
                value={selectedMomentId}
                onChange={(e) => setSelectedMomentId(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-1 text-xs text-stone-700 focus:outline-none focus:border-rose-600"
              >
                <option value="">Lier au planning Jour J (optionnel)</option>
                {moments.map((m) => (
                  <option key={m.id} value={m.id}>
                    {formatMomentTime(m.start_at)} — {m.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[11px] text-stone-500 hover:text-stone-800 px-2 py-1 uppercase"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!newLabel.trim() || busy}
              className="text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700 px-3 py-1 uppercase disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Sommaire des moments — ordinaux Bodoni, liseré rose actif */}
      <div className="flex md:flex-col overflow-x-auto scrollbar-none pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
        {sections.map((section, idx) => {
          const isActive = section.id === activeSectionId;
          const sectionTracks = tracks.filter((t) => t.section_id === section.id);
          const mustPlayCount = sectionTracks.filter((t) => t.flag === 'must_play').length;
          const linkedMoment = section.linked_moment_id
            ? momentsMap.get(section.linked_moment_id)
            : null;

          return (
            <div
              key={section.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectSection(section.id)}
              onKeyDown={(e) => e.key === 'Enter' && onSelectSection(section.id)}
              className={`group flex items-baseline gap-3 text-left whitespace-nowrap md:whitespace-normal px-3 py-2.5 md:px-0 md:py-3 border-b-2 md:border-b-0 md:border-l-2 cursor-pointer transition-colors min-w-[190px] md:min-w-0 ${
                isActive
                  ? 'border-rose-600 md:pl-4'
                  : 'border-transparent md:pl-4 hover:border-stone-300'
              }`}
            >
              {/* Ordinal Bodoni */}
              <span
                className={`text-lg leading-none tabular-nums select-none ${
                  isActive ? 'text-rose-500' : 'text-[#E5D5C8]'
                }`}
                style={{ fontFamily: "'Bodoni Moda', 'Didot', serif" }}
              >
                {String(idx + 1).padStart(2, '0')}
              </span>

              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`block text-[13px] leading-tight truncate ${
                      isActive ? 'text-charcoal-900 font-medium' : 'text-charcoal-500'
                    }`}
                  >
                    {section.label}
                  </span>
                  {mustPlayCount > 0 && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"
                      title={`${mustPlayCount} morceau(x) incontournable(s)`}
                    />
                  )}
                </span>
                <span className="block text-[11px] italic text-charcoal-400 mt-0.5">
                  {linkedMoment ? formatMomentTime(linkedMoment.start_at) : 'Horaire libre'}
                  {' · '}
                  {sectionTracks.length ? `${sectionTracks.length} titre${sectionTracks.length > 1 ? 's' : ''}` : 'aucun titre'}
                </span>
              </span>

              {/* Bouton supprimer section (si plus de 1 section) */}
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Supprimer le moment « ${section.label} » et ses morceaux ?`
                      )
                    ) {
                      onRemoveSection(section.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-stone-300 hover:text-red-600 transition-opacity shrink-0 self-center"
                  title="Supprimer ce moment"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
