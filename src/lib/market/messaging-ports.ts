// Interfaces (ports) de la messagerie — DIP : le service ne dépend que de ces
// contrats ; Firestore, Firebase Auth et l'envoi d'email sont des détails injectés.

import { RateBucket } from './messaging-rules';
import {
  ConversationReport,
  ListingSummary,
  MarketConversation,
  MarketMessage,
  ParticipantSnapshot,
} from './messaging-types';

/** Unité de travail atomique sur une conversation. Toutes les lectures AVANT les écritures. */
export interface ConversationTx {
  getConversation(): Promise<MarketConversation | null>;
  getMessage(id: string): Promise<MarketMessage | null>;
  setConversation(conversation: MarketConversation): void;
  setMessage(message: MarketMessage): void;
}

export interface MessagingStore {
  transact<T>(conversationId: string, fn: (tx: ConversationTx) => Promise<T>): Promise<T>;
  getConversation(id: string): Promise<MarketConversation | null>;
  /** Messages les plus récents, du plus ancien au plus récent. */
  listRecentMessages(conversationId: string, limit: number): Promise<MarketMessage[]>;

  getLastSeen(userId: string): Promise<string | null>;
  touchPresence(userId: string, iso: string): Promise<void>;

  isBlockedEitherWay(a: string, b: string): Promise<boolean>;
  /** Pose ou retire le blocage ET met à jour le drapeau `blocked_by` des conversations de la paire. */
  setBlock(blockerId: string, blockedId: string, on: boolean, iso: string): Promise<void>;

  /** Consomme une unité du quota de façon atomique. false = quota dépassé. */
  consumeRate(userId: string, bucket: RateBucket, nowMs: number): Promise<boolean>;

  saveReport(report: ConversationReport): Promise<void>;
}

export interface MessagingDirectory {
  /** Identité publique minimale (jamais d'email). null si le compte n'existe pas. */
  getParticipant(userId: string): Promise<ParticipantSnapshot | null>;
  getListing(listingId: string): Promise<ListingSummary | null>;
  hasSellerProfile(userId: string): Promise<boolean>;
}

export interface MessageNotifier {
  notifyNewMessage(n: {
    recipientId: string;
    senderName: string;
    preview: string;
    conversationId: string;
    listingTitle: string | null;
  }): Promise<void>;
}

export type Clock = () => number;
