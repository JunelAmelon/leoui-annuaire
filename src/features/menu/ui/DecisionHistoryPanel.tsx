'use client';

import { useState } from 'react';
import { History, Plus } from 'lucide-react';
import type { MenuDecision } from '../domain/types';

interface DecisionHistoryPanelProps {
  decisions: MenuDecision[];
  hasMore: boolean;
  loadingMore?: boolean;
  addingDecision?: boolean;
  onAddDecision: (change: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
}

export function DecisionHistoryPanel({
  decisions,
  hasMore,
  loadingMore = false,
  addingDecision = false,
  onAddDecision,
  onLoadMore,
}: DecisionHistoryPanelProps) {
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    await onAddDecision(note);
    setNote('');
  };

  const formatDate = (iso: string) => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-rose-600" />
        <div>
          <h3 className="font-serif text-xl text-charcoal-900">
            Journal des décisions traiteur
          </h3>
          <p className="text-xs text-charcoal-500">
            Historique des plats validés et comptes-rendus de dégustation.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Consigner une décision (ex. Validation du menu final avec le chef)"
          className="flex-1 h-9 px-3 rounded-lg border border-stone-200 bg-stone-50/50 text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-rose-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={addingDecision || !note.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </form>

      {decisions.length === 0 ? (
        <p className="text-xs italic text-charcoal-400 py-2">
          Aucune décision enregistrée pour le moment. Les validations de plats apparaîtront ici automatiquement.
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {decisions.map((item) => (
            <div
              key={item.id}
              className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
            >
              <p className="text-charcoal-800">{item.change}</p>
              <p className="text-[11px] text-charcoal-400 whitespace-nowrap">
                {item.by} · {formatDate(item.at)}
              </p>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-1">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="px-4 h-8 rounded-lg border border-stone-200 text-xs font-semibold text-charcoal-600 hover:border-charcoal-400 disabled:opacity-50"
          >
            {loadingMore ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}
    </section>
  );
}

