// Quota à fenêtre fixe, atomique, stocké dans Firestore (market_rate_limits).
// Server-only. La décision est pure et testée : voir decideRate (messaging-rules).

import type { Firestore } from 'firebase-admin/firestore';
import { RateState, decideRate } from '@/lib/market/messaging-rules';

export async function consumeRateLimit(
  db: Firestore,
  key: string,
  nowMs: number,
  config: { limit: number; windowMs: number }
): Promise<boolean> {
  const ref = db.collection('market_rate_limits').doc(key);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const { allowed, next } = decideRate(snap.exists ? (snap.data() as RateState) : null, nowMs, config);
    if (allowed) t.set(ref, next);
    return allowed;
  });
}
