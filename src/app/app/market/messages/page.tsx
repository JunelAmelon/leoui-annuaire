'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inbox } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/lib/market/client/realtime';
import ConversationList from '@/components/market/messaging/ConversationList';
import Thread from '@/components/market/messaging/Thread';

function MessagesInner() {
  const { user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get('c');
  const uid = user?.uid;

  const { conversations, ready } = useConversations(uid);

  const selected = useMemo(
    () => (selectedId ? conversations.find((c) => c.id === selectedId) ?? null : null),
    [conversations, selectedId]
  );

  const select = (id: string | null) => {
    router.replace(id ? `/app/market/messages?c=${encodeURIComponent(id)}` : '/app/market/messages', { scroll: false });
  };

  return (
    <div className="border border-charcoal-200 bg-white overflow-hidden h-[calc(100dvh-15rem)] min-h-[520px] grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Liste : pleine page sur mobile, colonne sur desktop */}
      <div className={`min-h-0 border-r border-charcoal-200 ${selectedId ? 'hidden lg:block' : ''}`}>
        {ready ? (
          <ConversationList conversations={conversations} uid={uid ?? ''} selectedId={selectedId} onSelect={select} />
        ) : (
          <ListSkeleton />
        )}
      </div>

      {/* Fil */}
      <div className={`min-h-0 ${selectedId ? '' : 'hidden lg:flex'} flex flex-col`}>
        {selected ? (
          <Thread key={selected.id} conversation={selected} uid={uid ?? ''} onBack={() => select(null)} />
        ) : (
          <div className="flex-1 hidden lg:flex flex-col items-center justify-center gap-3 text-center px-8">
            <span className="w-14 h-14 rounded-full bg-ivory-50 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-charcoal-400" />
            </span>
            <div>
              <p className="font-serif text-lg text-charcoal-900">Vos messages</p>
              <p className="text-sm text-charcoal-500 mt-1">
                {selectedId && !ready
                  ? 'Chargement de la conversation…'
                  : 'Sélectionnez une conversation, ou contactez un vendeur depuis une annonce.'}
              </p>
            </div>
          </div>
        )}
        {selectedId && !selected && ready && (
          <div className="lg:hidden flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-sm text-charcoal-500">Conversation introuvable.</p>
            <button type="button" onClick={() => select(null)} className="text-sm font-semibold text-rose-600">
              Retour aux messages
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-charcoal-100 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-4">
          <div className="w-11 h-11 rounded-full bg-charcoal-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 bg-charcoal-100 rounded" />
            <div className="h-3 w-1/2 bg-charcoal-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MarketMessagesPage() {
  return (
    <Suspense fallback={<div className="h-[520px] border border-charcoal-200 bg-white" />}>
      <MessagesInner />
    </Suspense>
  );
}
