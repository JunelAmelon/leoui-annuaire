'use client';

import { useEffect, useState } from 'react';
import { Check, FileDown, RefreshCw, Users } from 'lucide-react';
import type { DietarySummary } from '../domain/types';

interface DietarySummaryPanelProps {
  summary: DietarySummary;
  dietaryNotes: string;
  refreshing?: boolean;
  savingNotes?: boolean;
  onRefreshDietary: () => Promise<void>;
  onSaveNotes: (notes: string) => Promise<void>;
  onExportCatererPdf: () => void;
}

export function DietarySummaryPanel({
  summary,
  dietaryNotes,
  refreshing = false,
  savingNotes = false,
  onRefreshDietary,
  onSaveNotes,
  onExportCatererPdf,
}: DietarySummaryPanelProps) {
  const [notesDraft, setNotesDraft] = useState(dietaryNotes);

  useEffect(() => {
    setNotesDraft(dietaryNotes);
  }, [dietaryNotes]);

  const notesDirty = notesDraft.trim() !== dietaryNotes.trim();

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="label-xs text-rose-600 tracking-[0.1em]">Invités & Allergies</p>
          <h3 className="font-serif text-xl text-charcoal-900 mt-1">
            Régimes alimentaires et consignes traiteur
          </h3>
          <p className="text-xs text-charcoal-500 mt-1">
            Calculés automatiquement à partir de votre liste d’invités ({summary.total_confirmed} confirmés
            {summary.total_pending > 0 ? `, ${summary.total_pending} en attente` : ''}).
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onExportCatererPdf}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            Fiche traiteur PDF
          </button>
          <button
            type="button"
            disabled={refreshing}
            onClick={onRefreshDietary}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Grille des compteurs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {summary.categories.map((item) => (
          <div
            key={item.category}
            className="rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-3"
          >
            <p className="text-[11px] font-semibold text-charcoal-600 truncate">
              {item.category}
            </p>
            <p className="font-serif text-2xl text-charcoal-900 mt-1 tabular-nums">
              {item.confirmed}
            </p>
            <p className="text-[11px] text-charcoal-400">
              {item.pending > 0 ? `+${item.pending} en attente` : 'confirmés'}
            </p>
          </div>
        ))}
      </div>

      {/* Précisions nominatives */}
      {summary.special_requests.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-800">
            <Users className="w-3.5 h-3.5 text-rose-600" />
            Précisions et allergies signalées ({summary.special_requests.length})
          </div>
          <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden">
            {summary.special_requests.map((req) => (
              <div
                key={req.guest_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-4 py-2.5 bg-white text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-charcoal-900">{req.guest_name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      req.rsvp === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-100 text-charcoal-500 border-stone-200'
                    }`}
                  >
                    {req.rsvp === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
                <span className="text-charcoal-600">
                  {req.menu}
                  {req.menu_other ? ` — ${req.menu_other}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes diététiques générales */}
      <div className="space-y-2">
        <label
          htmlFor="dietary-notes"
          className="block text-xs font-semibold text-charcoal-800"
        >
          Consignes générales pour le traiteur
        </label>
        <textarea
          id="dietary-notes"
          rows={3}
          maxLength={2000}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          placeholder="Ex. Allergie sévère aux fruits à coque en table d'honneur, service des repas enfants à 20h00..."
          className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-3 text-sm text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-rose-400 focus:bg-white transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-charcoal-400">
            {notesDraft.length}/2000 caractères
          </span>
          <button
            type="button"
            disabled={savingNotes || !notesDirty}
            onClick={() => onSaveNotes(notesDraft)}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
            {savingNotes ? 'Enregistrement…' : 'Enregistrer les consignes'}
          </button>
        </div>
      </div>
    </section>
  );
}

