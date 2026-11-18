'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { MenuDecision } from '../domain/types';

interface DecisionHistoryPanelProps {
  decisions: MenuDecision[];
  hasMore: boolean;
  loadingMore?: boolean;
  addingDecision?: boolean;
  onAddDecision: (change: string) => Promise<void>;
  onLoadMore: () => Promise<void>;
}

const kicker = 'text-[10px] font-semibold tracking-[0.2em] uppercase';

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
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (iso: string) => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section className="bg-white border border-stone-200 px-5 sm:px-9 py-7">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className={`${kicker} text-rose-600`}>Journal</p>
          <h3 className="font-serif text-charcoal-900 text-xl mt-2">Décisions traiteur</h3>
        </div>
        <p className="text-[11px] text-charcoal-400">
          {decisions.length} entrée{decisions.length > 1 ? 's' : ''}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex items-end gap-4">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Consigner une décision — ex. menu final validé avec le chef"
          className="flex-1 bg-transparent border-0 border-b border-stone-300 px-0 py-2 text-[13.5px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none"
        />
        <button
          type="submit"
          disabled={addingDecision || !note.trim()}
          className="inline-flex items-center gap-1.5 h-10 px-5 bg-rose-600 text-white text-[12px] font-medium hover:bg-rose-700 transition-colors rounded-sm disabled:opacity-40 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Consigner
        </button>
      </form>

      {decisions.length === 0 ? (
        <p className="text-[12.5px] italic text-charcoal-400 py-6">
          Les validations de plats et comptes-rendus de dégustation apparaîtront ici.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-stone-100">
          {decisions.map((item) => (
            <div key={item.id} className="py-3.5 grid sm:grid-cols-[7.5rem_1fr] gap-x-6 gap-y-1">
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-charcoal-400 pt-0.5">
                {formatDate(item.at)}
                <span className="block text-charcoal-300 font-normal tracking-normal normal-case mt-0.5">
                  {formatTime(item.at)}
                </span>
              </p>
              <div>
                <p className="text-[13.5px] text-charcoal-800 leading-relaxed">{item.change}</p>
                <p className="text-[11px] text-charcoal-400 mt-0.5">{item.by}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="pt-4 border-t border-stone-100 mt-2">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="text-[12px] font-medium text-charcoal-500 underline underline-offset-4 decoration-stone-300 hover:text-charcoal-900 hover:decoration-charcoal-900 transition-colors disabled:opacity-40"
          >
            {loadingMore ? 'Chargement…' : 'Voir les entrées plus anciennes'}
          </button>
        </div>
      )}
    </section>
  );
}
