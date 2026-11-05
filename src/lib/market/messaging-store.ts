// Persistance Firestore de la messagerie. Reçoit `db` par injection (DIP).
// Collections : market_conversations (+ sous-collection messages), market_presence,
// market_blocks, market_rate_limits, market_reports.

import type { Firestore } from 'firebase-admin/firestore';
import { ConversationTx, MessagingStore } from './messaging-ports';
import { RATE_LIMITS, RateBucket } from './messaging-rules';
import { consumeRateLimit } from '@/lib/rate-limit';
import { ConversationReport, MarketConversation, MarketMessage } from './messaging-types';
import { stripUndefined } from './utils';

export const CONVERSATIONS = 'market_conversations';

export function createFirestoreMessagingStore(db: Firestore): MessagingStore {
  const convs = () => db.collection(CONVERSATIONS);
  const blockId = (blocker: string, blocked: string) => `${blocker}_${blocked}`;

  return {
    transact(conversationId, fn) {
      return db.runTransaction(async (t) => {
        const convRef = convs().doc(conversationId);
        const messages = convRef.collection('messages');
        const tx: ConversationTx = {
          async getConversation() {
            const s = await t.get(convRef);
            return s.exists ? ({ ...s.data(), id: s.id } as MarketConversation) : null;
          },
          async getMessage(id) {
            const s = await t.get(messages.doc(id));
            return s.exists ? ({ ...s.data(), id: s.id } as MarketMessage) : null;
          },
          setConversation(c) {
            t.set(convRef, stripUndefined(c));
          },
          setMessage(m) {
            t.set(messages.doc(m.id), stripUndefined(m));
          },
        };
        return fn(tx);
      });
    },

    async getConversation(id) {
      const s = await convs().doc(id).get();
      return s.exists ? ({ ...s.data(), id: s.id } as MarketConversation) : null;
    },

    async listRecentMessages(conversationId, limit) {
      const snap = await convs()
        .doc(conversationId)
        .collection('messages')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as MarketMessage).reverse();
    },

    async getLastSeen(userId) {
      const s = await db.collection('market_presence').doc(userId).get();
      return s.exists ? ((s.data() as { last_seen_at?: string }).last_seen_at ?? null) : null;
    },

    async touchPresence(userId, iso) {
      await db.collection('market_presence').doc(userId).set({ user_id: userId, last_seen_at: iso });
    },

    async isBlockedEitherWay(a, b) {
      const [ab, ba] = await Promise.all([
        db.collection('market_blocks').doc(blockId(a, b)).get(),
        db.collection('market_blocks').doc(blockId(b, a)).get(),
      ]);
      return ab.exists || ba.exists;
    },

    async setBlock(blockerId, blockedId, on, iso) {
      const ref = db.collection('market_blocks').doc(blockId(blockerId, blockedId));
      if (on) await ref.set({ blocker_id: blockerId, blocked_id: blockedId, created_at: iso });
      else await ref.delete();

      // Répercute sur les conversations de la paire (composeur désactivé côté client).
      const snap = await convs().where('participant_ids', 'array-contains', blockerId).get();
      const batch = db.batch();
      snap.docs.forEach((d) => {
        const c = d.data() as MarketConversation;
        if (!c.participant_ids.includes(blockedId)) return;
        if (on) batch.update(d.ref, { blocked_by: blockerId, updated_at: iso });
        else if (c.blocked_by === blockerId) batch.update(d.ref, { blocked_by: null, updated_at: iso });
      });
      await batch.commit();
    },

    consumeRate(userId, bucket: RateBucket, nowMs) {
      return consumeRateLimit(db, `${userId}_${bucket}`, nowMs, RATE_LIMITS[bucket]);
    },

    async saveReport(report: ConversationReport) {
      const ref = db.collection('market_reports').doc();
      await ref.set(stripUndefined({ id: ref.id, ...report }));
    },
  };
}
