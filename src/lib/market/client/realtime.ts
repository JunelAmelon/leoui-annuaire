'use client';

// Lecture temps réel de la messagerie. Les écritures passent TOUJOURS par l'API ;
// les règles Firestore n'autorisent ici que la lecture aux participants.

import { useEffect, useState } from 'react';
import { collection, doc, limitToLast, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isOnline } from '../messaging-rules';
import { MarketConversation, MarketMessage } from '../messaging-types';
import { marketApi } from './api';

interface ConvState {
  conversations: MarketConversation[];
  ready: boolean;
}

// Un seul écouteur par utilisateur, partagé (Header, navigation, boîte de réception).
const shared = new Map<string, { state: ConvState; listeners: Set<(s: ConvState) => void>; unsub: () => void }>();

function subscribeConversations(uid: string, listener: (s: ConvState) => void): () => void {
  let entry = shared.get(uid);
  if (!entry) {
    const created = {
      state: { conversations: [], ready: false } as ConvState,
      listeners: new Set<(s: ConvState) => void>(),
      unsub: () => {},
    };
    const push = (state: ConvState) => {
      created.state = state;
      created.listeners.forEach((l) => l(state));
    };
    created.unsub = onSnapshot(
      query(collection(db, 'market_conversations'), where('participant_ids', 'array-contains', uid)),
      (snap) =>
        push({
          ready: true,
          conversations: snap.docs
            .map((d) => ({ ...d.data(), id: d.id }) as MarketConversation)
            .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)),
        }),
      () => push({ conversations: [], ready: true }) // règles non déployées, hors ligne…
    );
    shared.set(uid, created);
    entry = created;
  }
  entry.listeners.add(listener);
  listener(entry.state);

  return () => {
    const e = shared.get(uid);
    if (!e) return;
    e.listeners.delete(listener);
    if (e.listeners.size === 0) {
      e.unsub();
      shared.delete(uid);
    }
  };
}

export function useConversations(uid?: string | null): ConvState {
  const [state, setState] = useState<ConvState>({ conversations: [], ready: false });
  useEffect(() => {
    if (!uid) {
      setState({ conversations: [], ready: true });
      return;
    }
    return subscribeConversations(uid, setState);
  }, [uid]);
  return state;
}

export function useUnreadCount(uid?: string | null): number {
  const { conversations } = useConversations(uid);
  return uid ? conversations.reduce((n, c) => n + (c.unread?.[uid] ?? 0), 0) : 0;
}

export function useMessages(conversationId: string | null, limitCount: number) {
  const [messages, setMessages] = useState<MarketMessage[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMessages([]);
    setReady(false);
    if (!conversationId) return;
    return onSnapshot(
      query(
        collection(db, 'market_conversations', conversationId, 'messages'),
        orderBy('created_at', 'asc'),
        limitToLast(limitCount)
      ),
      (snap) => {
        setMessages(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as MarketMessage));
        setReady(true);
      },
      () => setReady(true)
    );
  }, [conversationId, limitCount]);

  return { messages, ready, hasMore: messages.length >= limitCount };
}

/** Présence d'un utilisateur : recalculée toutes les 20 s pour passer « hors ligne » sans événement. */
export function usePresenceOf(uid?: string | null) {
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setLastSeen(null);
    if (!uid) return;
    return onSnapshot(
      doc(db, 'market_presence', uid),
      (s) => setLastSeen(s.exists() ? ((s.data() as { last_seen_at?: string }).last_seen_at ?? null) : null),
      () => setLastSeen(null)
    );
  }, [uid]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(id);
  }, []);

  return { lastSeen, online: isOnline(lastSeen, now), now };
}

/** Signal de présence tant que l'onglet est visible. */
export function usePresenceHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const beat = () => {
      if (document.visibilityState === 'visible') marketApi('/api/market/presence', { method: 'POST' }).catch(() => {});
    };
    beat();
    const id = setInterval(beat, 45_000);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [enabled]);
}
