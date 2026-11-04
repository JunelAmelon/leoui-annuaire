'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar } from '../ui';
import { MarketConversation } from '@/lib/market/messaging-types';
import { shortStamp } from './format';

export default function ConversationList({
  conversations,
  uid,
  selectedId,
  onSelect,
}: {
  conversations: MarketConversation[];
  uid: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState('');
  const now = Date.now();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) => {
      const other = c.participants[c.participant_ids.find((id) => id !== uid) as string];
      return (
        other?.display_name.toLowerCase().includes(term) ||
        c.listing_snapshot?.title.toLowerCase().includes(term)
      );
    });
  }, [conversations, q, uid]);

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="p-4 border-b border-charcoal-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher"
            aria-label="Rechercher une conversation"
            className="input-field pl-9 py-2.5"
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-charcoal-100">
        {filtered.length === 0 && (
          <li className="p-6 text-sm text-charcoal-500 text-center">
            {conversations.length === 0 ? 'Aucune conversation pour le moment.' : 'Aucun résultat.'}
          </li>
        )}
        {filtered.map((c) => {
          const otherId = c.participant_ids.find((id) => id !== uid) as string;
          const other = c.participants[otherId];
          const unread = c.unread?.[uid] ?? 0;
          const active = c.id === selectedId;
          const mine = c.last_message?.sender_id === uid;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                aria-current={active}
                className={`w-full flex gap-3 p-4 text-left transition-colors ${
                  active ? 'bg-ivory-50 border-l-2 border-rose-600 pl-[14px]' : 'hover:bg-ivory-50/60'
                }`}
              >
                <Avatar name={other?.display_name} photoUrl={other?.photo_url} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm truncate ${unread ? 'font-semibold text-charcoal-900' : 'font-medium text-charcoal-800'}`}>
                      {other?.display_name ?? 'Utilisateur'}
                    </p>
                    <span className="text-[11px] text-charcoal-400 flex-shrink-0 tabular-nums">
                      {shortStamp(c.last_message_at, now)}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-400 truncate mt-0.5">
                    {c.listing_snapshot ? c.listing_snapshot.title : 'Contact depuis le profil'}
                  </p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className={`text-xs truncate ${unread ? 'text-charcoal-900' : 'text-charcoal-500'}`}>
                      {c.last_message ? `${mine ? 'Vous : ' : ''}${c.last_message.preview}` : 'Nouvelle conversation'}
                    </p>
                    {unread > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-semibold flex items-center justify-center tabular-nums">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
