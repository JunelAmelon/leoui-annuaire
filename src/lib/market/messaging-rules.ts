// Règles pures de la messagerie — aucune dépendance (ni Firestore, ni horloge
// implicite) : tout est testable en passant l'heure en paramètre.

export const MESSAGE_MAX_LENGTH = 2000;
export const MAX_ATTACHMENTS = 3;
export const EDIT_WINDOW_MS = 10 * 60 * 1000;
export const ONLINE_THRESHOLD_MS = 90 * 1000;
export const EMAIL_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;

export const RATE_LIMITS = {
  message: { limit: 30, windowMs: 60 * 1000 },
  new_conversation: { limit: 10, windowMs: 60 * 60 * 1000 },
} as const;

export type RateBucket = keyof typeof RATE_LIMITS;

/**
 * Identifiant déterministe : un seul fil par (acheteur, vendeur, annonce).
 * Sans annonce (contact depuis un profil), la paire est triée pour que
 * A→B et B→A retombent sur la même conversation.
 */
export function conversationId(userId: string, otherId: string, listingId: string | null): string {
  if (listingId) return `${userId}_${otherId}_${listingId}`;
  return `${[userId, otherId].sort().join('_')}_profile`;
}

export function isOnline(lastSeenIso: string | null | undefined, nowMs: number): boolean {
  if (!lastSeenIso) return false;
  const seen = Date.parse(lastSeenIso);
  return Number.isFinite(seen) && nowMs - seen <= ONLINE_THRESHOLD_MS;
}

export type ActivityBucket = 'online' | 'hour' | 'day' | 'week' | 'longer' | null;

/** Activité volontairement grossière pour l'affichage public (jamais l'heure exacte). */
export function activityBucket(lastSeenIso: string | null | undefined, nowMs: number): ActivityBucket {
  if (!lastSeenIso) return null;
  const seen = Date.parse(lastSeenIso);
  if (!Number.isFinite(seen)) return null;
  const age = nowMs - seen;
  if (age <= ONLINE_THRESHOLD_MS) return 'online';
  if (age < 60 * 60 * 1000) return 'hour';
  if (age < 24 * 60 * 60 * 1000) return 'day';
  if (age < 7 * 24 * 60 * 60 * 1000) return 'week';
  return 'longer';
}

export type ModifyVerdict = 'ok' | 'not_owner' | 'deleted' | 'expired';

/** Un message ne se modifie / supprime que par son auteur, pendant 10 minutes. */
export function canModifyMessage(
  message: { sender_id: string; created_at: string; deleted_at: string | null },
  userId: string,
  nowMs: number
): ModifyVerdict {
  if (message.sender_id !== userId) return 'not_owner';
  if (message.deleted_at) return 'deleted';
  if (nowMs - Date.parse(message.created_at) > EDIT_WINDOW_MS) return 'expired';
  return 'ok';
}

/** « Vu » : le destinataire a lu la conversation après l'envoi du message. */
export function isSeenBy(message: { created_at: string }, otherLastReadAt: string | null | undefined): boolean {
  return !!otherLastReadAt && message.created_at <= otherLastReadAt;
}

export interface RateState {
  window_start: number;
  count: number;
}

/** Fenêtre fixe : renvoie la décision et le nouvel état à persister. */
export function decideRate(
  state: RateState | null,
  nowMs: number,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; next: RateState } {
  if (!state || nowMs - state.window_start >= windowMs) {
    return { allowed: true, next: { window_start: nowMs, count: 1 } };
  }
  if (state.count >= limit) return { allowed: false, next: state };
  return { allowed: true, next: { window_start: state.window_start, count: state.count + 1 } };
}

/** Email de notification : seulement si le destinataire est hors ligne et pas déjà prévenu récemment. */
export function shouldSendEmail(args: {
  recipientLastSeen: string | null | undefined;
  lastNotifiedAt: string | null | undefined;
  nowMs: number;
}): boolean {
  if (isOnline(args.recipientLastSeen, args.nowMs)) return false;
  if (args.lastNotifiedAt && args.nowMs - Date.parse(args.lastNotifiedAt) < EMAIL_NOTIFY_COOLDOWN_MS) return false;
  return true;
}
