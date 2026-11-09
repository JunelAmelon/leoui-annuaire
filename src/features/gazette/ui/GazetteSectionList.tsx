'use client';

import { useState } from 'react';
import {
  GazetteSection,
  GazetteSectionType,
} from '../domain/types';
import {
  BookOpen,
  Sparkles,
  HelpCircle,
  Clock,
  AlignLeft,
  ChevronUp,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
} from 'lucide-react';

interface GazetteSectionListProps {
  sections: GazetteSection[];
  onEditSection: (section: GazetteSection) => void;
  onDeleteSection: (sectionId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddSection: (type: GazetteSectionType) => void;
}

const SECTION_TYPE_CONFIG: Record<
  GazetteSectionType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  story: {
    label: 'Histoire & Rencontre',
    icon: BookOpen,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  anecdote: {
    label: 'Anecdotes & Secrets',
    icon: Sparkles,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  quiz: {
    label: 'Le Grand Quiz (QCM)',
    icon: HelpCircle,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  program: {
    label: 'Programme du Jour J',
    icon: Clock,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  custom: {
    label: 'Article Libre / Remerciements',
    icon: AlignLeft,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

export function GazetteSectionList({
  sections,
  onEditSection,
  onDeleteSection,
  onMoveUp,
  onMoveDown,
  onAddSection,
}: GazetteSectionListProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header avec compteur et bouton d'ajout */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-stone-900 text-sm">
            Rubriques de la Gazette ({sections.length} / 30)
          </h3>
          <p className="text-xs text-stone-500">
            Organisez et modifiez les articles qui composent votre journal
          </p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            disabled={sections.length >= 30}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Ajouter une rubrique
          </button>

          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 z-20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-stone-400 px-3 py-1 block">
                Type de rubrique :
              </span>
              {(Object.keys(SECTION_TYPE_CONFIG) as GazetteSectionType[]).map((type) => {
                const conf = SECTION_TYPE_CONFIG[type];
                const Icon = conf.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onAddSection(type);
                      setShowAddMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 rounded-xl flex items-center gap-2.5 transition"
                  >
                    <Icon className="w-4 h-4 text-stone-500" />
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Liste des rubriques réordonnables */}
      <div className="space-y-2.5">
        {sections.map((section, index) => {
          const conf = SECTION_TYPE_CONFIG[section.type] || SECTION_TYPE_CONFIG.custom;
          const Icon = conf.icon;
          const isFirst = index === 0;
          const isLast = index === sections.length - 1;

          return (
            <div
              key={section.id}
              className="bg-white border border-stone-200/80 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-stone-300 shadow-2xs transition group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Numéro d'ordre */}
                <span className="w-6 h-6 rounded-lg bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {index + 1}
                </span>

                {/* Badge type */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border shrink-0 ${conf.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{conf.label}</span>
                </span>

                {/* Titre */}
                <div className="truncate">
                  <h4 className="font-semibold text-stone-900 text-sm truncate">
                    {section.title}
                  </h4>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={() => onMoveUp(index)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-20 transition"
                  title="Monter"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={() => onMoveDown(index)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 disabled:opacity-20 transition"
                  title="Descendre"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onEditSection(section)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                  title="Modifier"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSection(section.id)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
