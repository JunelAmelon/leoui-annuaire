'use client';

import { useEffect, useState } from 'react';
import { Check, FileDown, RefreshCw } from 'lucide-react';
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

const kicker = 'text-[10px] font-semibold tracking-[0.2em] uppercase';

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
    <section className="bg-white border border-stone-200">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        {/* Colonne gauche : consignes traiteur */}
        <div className="px-5 sm:px-9 py-7 order-2 lg:order-1 border-t lg:border-t-0 lg:border-r border-stone-200">
          <p className={`${kicker} text-rose-600`}>Consignes traiteur</p>
          <h3 className="font-serif text-charcoal-900 text-xl mt-2">
            À transmettre au chef
          </h3>
          <p className="text-[12.5px] text-charcoal-500 mt-1.5 leading-relaxed">
            Allergies sévères, horaires de service enfants, matériel à prévoir — tout ce qui doit figurer sur la fiche traiteur.
          </p>

          <textarea
            id="dietary-notes"
            rows={5}
            maxLength={2000}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Ex. Allergie sévère aux fruits à coque en table d'honneur, service des repas enfants à 20h00…"
            className="w-full mt-5 bg-ivory-50 border-0 border-b-2 border-stone-300 px-4 pt-3 pb-2 text-[14px] italic text-charcoal-800 placeholder:text-charcoal-300 placeholder:not-italic focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none resize-y leading-7"
          />
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onExportCatererPdf}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-charcoal-600 underline underline-offset-4 decoration-stone-300 hover:text-charcoal-900 hover:decoration-charcoal-900 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" /> Fiche traiteur PDF
              </button>
            </div>
            <button
              type="button"
              disabled={savingNotes || !notesDirty}
              onClick={() => onSaveNotes(notesDraft)}
              className="inline-flex items-center gap-1.5 h-10 px-5 bg-rose-600 text-white text-[12px] font-medium hover:bg-rose-700 transition-colors rounded-sm disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              {savingNotes ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Colonne droite : compteurs */}
        <div className="px-5 sm:px-9 py-7 order-1 lg:order-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`${kicker} text-rose-600`}>Invités &amp; régimes</p>
              <h3 className="font-serif text-charcoal-900 text-xl mt-2">
                {summary.total_confirmed} confirmé{summary.total_confirmed > 1 ? 's' : ''}
                {summary.total_pending > 0 && (
                  <span className="text-charcoal-400 text-base font-normal">
                    {' '}· {summary.total_pending} en attente
                  </span>
                )}
              </h3>
            </div>
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefreshDietary}
              aria-label="Actualiser les compteurs"
              className="text-charcoal-400 hover:text-charcoal-900 transition-colors disabled:opacity-40 pt-1"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Compteurs en ligne éditoriale */}
          <div className="mt-5 divide-y divide-stone-100">
            {summary.categories.map((item) => (
              <div key={item.category} className="flex items-baseline justify-between py-2.5">
                <span className="text-[13px] text-charcoal-700">{item.category}</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-serif text-xl text-charcoal-900 tabular-nums">{item.confirmed}</span>
                  {item.pending > 0 && (
                    <span className="text-[11px] text-charcoal-400">+{item.pending}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Précisions nominatives */}
      {summary.special_requests.length > 0 && (
        <div className="border-t border-stone-200 px-5 sm:px-9 py-6">
          <p className={`${kicker} text-charcoal-500`}>
            Précisions &amp; allergies signalées — {summary.special_requests.length}
          </p>
          <div className="mt-3 divide-y divide-stone-100">
            {summary.special_requests.map((req) => (
              <div
                key={req.guest_id}
                className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5"
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="font-serif text-[15px] text-charcoal-900">{req.guest_name}</span>
                  <span className={`text-[10px] font-semibold tracking-[0.12em] uppercase ${
                    req.rsvp === 'confirmed' ? 'text-emerald-700' : 'text-charcoal-400'
                  }`}>
                    {req.rsvp === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
                <span className="text-[12.5px] italic text-charcoal-500">
                  {req.menu}
                  {req.menu_other ? ` — ${req.menu_other}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
