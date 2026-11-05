// Types de la messagerie LeOui Market — alignés sur docs/FIRESTORE_SCHEMA.md.
// Collections : market_conversations/{id}, sous-collection messages/{id},
// market_presence/{uid}, market_blocks/{blocker}_{blocked}, market_rate_limits/*.

export interface ParticipantSnapshot {
  display_name: string;
  photo_url: string | null;
}

export interface ListingSnapshot {
  title: string;
  image: string | null;
  price: number;
  slug: string;
}

export interface LastMessage {
  message_id: string;
  sender_id: string;
  /** Aperçu court, sans mise en forme. */
  preview: string;
  at: string;
}

export interface MarketConversation {
  id: string;
  /** Initiateur du contact. Pour une conversation « profil », le premier à avoir écrit. */
  buyer_id: string;
  seller_id: string;
  /** Dénormalisé pour les règles Firestore (lecture réservée aux participants). */
  participant_ids: string[];
  participants: Record<string, ParticipantSnapshot>;
  listing_id: string | null;
  listing_snapshot: ListingSnapshot | null;
  last_message: LastMessage | null;
  last_message_at: string;
  /** Messages non lus par participant (maintenu côté serveur uniquement). */
  unread: Record<string, number>;
  /** Dernière lecture par participant : sert aux accusés « vu ». */
  last_read_at: Record<string, string>;
  /** Dernier email de notification par destinataire (anti-spam). */
  notified_at: Record<string, string>;
  /** uid de celui qui a bloqué l'autre, sinon null. */
  blocked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  url: string;
}

export interface MarketMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachments: MessageAttachment[];
  created_at: string;
  edited_at: string | null;
  /** Message supprimé : le contenu est effacé, seule la trace reste. */
  deleted_at: string | null;
}

export type ConversationReportReason = 'spam' | 'arnaque' | 'harcelement' | 'contenu_inapproprie' | 'autre';

export interface ConversationReport {
  conversation_id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ConversationReportReason;
  comment?: string;
  /** Copie des derniers messages : la suppression ultérieure n'efface pas la preuve. */
  evidence: Pick<MarketMessage, 'id' | 'sender_id' | 'body' | 'attachments' | 'created_at' | 'deleted_at'>[];
  status: 'open';
  type: 'conversation';
  created_at: string;
}

export interface ListingSummary {
  id: string;
  seller_id: string;
  title: string;
  image: string | null;
  price: number;
  slug: string;
  status: string;
}
