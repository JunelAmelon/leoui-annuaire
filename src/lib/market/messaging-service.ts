// Règles métier de la messagerie Market.
// DIP : store, annuaire, notifieur et horloge sont injectés → testable sans Firestore.
// Toute écriture passe par ici : propriété, fenêtre de 10 min, quotas, blocage, contenu.

import { ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError, ValidationError } from './errors';
import { Clock, MessageNotifier, MessagingDirectory, MessagingStore } from './messaging-ports';
import {
  RATE_LIMITS,
  RateBucket,
  canModifyMessage,
  conversationId,
  shouldSendEmail,
} from './messaging-rules';
import {
  ConversationReport,
  MarketConversation,
  MarketMessage,
  MessageAttachment,
  ParticipantSnapshot,
} from './messaging-types';
import {
  assertMessageAllowed,
  buildPreview,
  normalizeBody,
  parseAttachments,
  parseClientId,
  parseOptionalComment,
  parseReportReason,
} from './messaging-validation';

export interface MessagingDeps {
  store: MessagingStore;
  directory: MessagingDirectory;
  notifier: MessageNotifier;
  clock?: Clock;
  /** Nom du compte Cloudinary autorisé pour les pièces jointes. */
  cloudName?: string;
}

const UNREACHABLE = 'Cet utilisateur n’est pas joignable';
const FALLBACK_PARTICIPANT: ParticipantSnapshot = { display_name: 'Utilisateur', photo_url: null };

export function createMessagingService(deps: MessagingDeps) {
  const { store, directory, notifier, cloudName } = deps;
  const now = deps.clock ?? Date.now;
  const iso = () => new Date(now()).toISOString();

  const other = (c: MarketConversation, userId: string) =>
    c.participant_ids.find((id) => id !== userId) as string;

  async function requireConversation(userId: string, id: string): Promise<MarketConversation> {
    const c = await store.getConversation(id);
    // 404 aussi pour un non-participant : ne révèle pas l'existence d'un fil.
    if (!c || !c.participant_ids.includes(userId)) throw new NotFoundError('Conversation introuvable');
    return c;
  }

  async function spend(userId: string, bucket: RateBucket) {
    if (!(await store.consumeRate(userId, bucket, now()))) {
      const { limit } = RATE_LIMITS[bucket];
      throw new TooManyRequestsError(
        bucket === 'message'
          ? `Vous écrivez trop vite (${limit} messages par minute maximum).`
          : 'Trop de nouvelles conversations. Réessayez plus tard.'
      );
    }
  }

  function parseContent(rawBody: unknown, rawAttachments: unknown) {
    const body = normalizeBody(rawBody);
    const attachments = parseAttachments(rawAttachments, cloudName);
    if (!body && attachments.length === 0) {
      throw new ValidationError('Écrivez un message ou ajoutez une photo', { body: 'Message vide' });
    }
    assertMessageAllowed(body);
    return { body, attachments };
  }

  /** Dépose un message et met à jour le fil, de façon atomique et idempotente. */
  async function deliver(args: {
    conversationId: string;
    senderId: string;
    clientId: string;
    body: string;
    attachments: MessageAttachment[];
    create?: MarketConversation;
  }): Promise<{ conversation: MarketConversation; message: MarketMessage; created: boolean }> {
    const at = iso();
    const result = await store.transact(args.conversationId, async (tx) => {
      const duplicate = await tx.getMessage(args.clientId);
      const existing = await tx.getConversation();
      const base = existing ?? args.create ?? null;
      if (!base) throw new NotFoundError('Conversation introuvable');
      if (!base.participant_ids.includes(args.senderId)) throw new NotFoundError('Conversation introuvable');

      if (duplicate) {
        if (duplicate.sender_id !== args.senderId) throw new ConflictError('Identifiant de message déjà utilisé');
        return { conversation: base, message: duplicate, created: false };
      }
      if (base.blocked_by) throw new ForbiddenError(UNREACHABLE);

      const recipientId = other(base, args.senderId);
      const message: MarketMessage = {
        id: args.clientId,
        conversation_id: base.id,
        sender_id: args.senderId,
        body: args.body,
        attachments: args.attachments,
        created_at: at,
        edited_at: null,
        deleted_at: null,
      };
      const conversation: MarketConversation = {
        ...base,
        last_message: {
          message_id: message.id,
          sender_id: args.senderId,
          preview: buildPreview(args.body, args.attachments.length),
          at,
        },
        last_message_at: at,
        unread: { ...base.unread, [recipientId]: (base.unread[recipientId] ?? 0) + 1 },
        updated_at: at,
      };
      tx.setMessage(message);
      tx.setConversation(conversation);
      return { conversation, message, created: true };
    });

    if (result.created) await notifyIfNeeded(result.conversation, args.senderId, result.message);
    return result;
  }

  /** Réserve le droit d'envoyer l'email (anti-doublon) puis l'envoie. Ne fait jamais échouer le message. */
  async function notifyIfNeeded(conversation: MarketConversation, senderId: string, message: MarketMessage) {
    try {
      const recipientId = other(conversation, senderId);
      const lastSeen = await store.getLastSeen(recipientId);

      const claimed = await store.transact(conversation.id, async (tx) => {
        const current = await tx.getConversation();
        if (!current) return false;
        const ok = shouldSendEmail({
          recipientLastSeen: lastSeen,
          lastNotifiedAt: current.notified_at?.[recipientId],
          nowMs: now(),
        });
        if (!ok) return false;
        tx.setConversation({ ...current, notified_at: { ...(current.notified_at ?? {}), [recipientId]: iso() } });
        return true;
      });
      if (!claimed) return;

      await notifier.notifyNewMessage({
        recipientId,
        senderName: conversation.participants[senderId]?.display_name ?? FALLBACK_PARTICIPANT.display_name,
        preview: buildPreview(message.body, message.attachments.length),
        conversationId: conversation.id,
        listingTitle: conversation.listing_snapshot?.title ?? null,
      });
    } catch {
      /* une notification ratée ne doit jamais bloquer ni annuler un message */
    }
  }

  return {
    /** Premier contact depuis une annonce (listing_id) ou un profil vendeur (seller_id). */
    async startConversation(
      userId: string,
      input: { listing_id?: unknown; seller_id?: unknown; body?: unknown; attachments?: unknown; client_id?: unknown }
    ) {
      const clientId = parseClientId(input.client_id);
      const { body, attachments } = parseContent(input.body, input.attachments);

      let listing = null as Awaited<ReturnType<MessagingDirectory['getListing']>>;
      let sellerId: string;
      if (typeof input.listing_id === 'string' && input.listing_id) {
        listing = await directory.getListing(input.listing_id);
        if (!listing || ['removed', 'draft'].includes(listing.status)) throw new NotFoundError('Annonce introuvable');
        sellerId = listing.seller_id;
      } else if (typeof input.seller_id === 'string' && input.seller_id) {
        sellerId = input.seller_id;
        if (!(await directory.hasSellerProfile(sellerId))) throw new NotFoundError('Vendeur introuvable');
      } else {
        throw new ValidationError('Annonce ou vendeur requis', { listing_id: 'Requis' });
      }

      if (sellerId === userId) throw new ForbiddenError('Vous ne pouvez pas vous écrire à vous-même');
      if (await store.isBlockedEitherWay(userId, sellerId)) throw new ForbiddenError(UNREACHABLE);

      const id = conversationId(userId, sellerId, listing?.id ?? null);
      const existing = await store.getConversation(id);
      if (!existing) await spend(userId, 'new_conversation');
      await spend(userId, 'message');

      const at = iso();
      let fresh: MarketConversation | undefined;
      if (!existing) {
        const [me, seller] = await Promise.all([directory.getParticipant(userId), directory.getParticipant(sellerId)]);
        if (!seller) throw new NotFoundError('Vendeur introuvable');
        fresh = {
          id,
          buyer_id: userId,
          seller_id: sellerId,
          participant_ids: [userId, sellerId],
          participants: { [userId]: me ?? FALLBACK_PARTICIPANT, [sellerId]: seller },
          listing_id: listing?.id ?? null,
          listing_snapshot: listing
            ? { title: listing.title, image: listing.image, price: listing.price, slug: listing.slug }
            : null,
          last_message: null,
          last_message_at: at,
          unread: { [userId]: 0, [sellerId]: 0 },
          last_read_at: { [userId]: at },
          notified_at: {},
          blocked_by: null,
          created_at: at,
          updated_at: at,
        };
      }

      return deliver({ conversationId: id, senderId: userId, clientId, body, attachments, create: fresh });
    },

    async sendMessage(
      userId: string,
      conversationIdParam: string,
      input: { body?: unknown; attachments?: unknown; client_id?: unknown }
    ) {
      const conversation = await requireConversation(userId, conversationIdParam);
      const clientId = parseClientId(input.client_id);
      const { body, attachments } = parseContent(input.body, input.attachments);

      if (conversation.blocked_by || (await store.isBlockedEitherWay(userId, other(conversation, userId)))) {
        throw new ForbiddenError(UNREACHABLE);
      }
      await spend(userId, 'message');
      return deliver({ conversationId: conversation.id, senderId: userId, clientId, body, attachments });
    },

    /** Modification du texte, dans les 10 minutes suivant l'envoi. Les photos ne se modifient pas. */
    async editMessage(userId: string, conversationIdParam: string, messageId: string, rawBody: unknown) {
      const conversation = await requireConversation(userId, conversationIdParam);
      if (conversation.blocked_by) throw new ForbiddenError(UNREACHABLE);

      const body = normalizeBody(rawBody);
      assertMessageAllowed(body);
      await spend(userId, 'message');

      const at = iso();
      return store.transact(conversation.id, async (tx) => {
        const message = await tx.getMessage(messageId);
        const current = await tx.getConversation();
        if (!message || !current) throw new NotFoundError('Message introuvable');

        const verdict = canModifyMessage(message, userId, now());
        if (verdict === 'not_owner') throw new ForbiddenError('Vous ne pouvez modifier que vos messages');
        if (verdict === 'deleted') throw new ConflictError('Ce message a été supprimé');
        if (verdict === 'expired') throw new ConflictError('Le délai de modification de 10 minutes est dépassé');

        if (!body && message.attachments.length === 0) {
          throw new ValidationError('Un message ne peut pas être vide', { body: 'Message vide' });
        }
        if (body === message.body) return message;

        const updated: MarketMessage = { ...message, body, edited_at: at };
        tx.setMessage(updated);
        if (current.last_message?.message_id === messageId) {
          tx.setConversation({
            ...current,
            last_message: { ...current.last_message, preview: buildPreview(body, message.attachments.length) },
            updated_at: at,
          });
        }
        return updated;
      });
    },

    /** Suppression (« message supprimé ») dans les 10 minutes : le contenu est effacé. */
    async deleteMessage(userId: string, conversationIdParam: string, messageId: string) {
      const conversation = await requireConversation(userId, conversationIdParam);
      const at = iso();

      return store.transact(conversation.id, async (tx) => {
        const message = await tx.getMessage(messageId);
        const current = await tx.getConversation();
        if (!message || !current) throw new NotFoundError('Message introuvable');

        const verdict = canModifyMessage(message, userId, now());
        if (verdict === 'not_owner') throw new ForbiddenError('Vous ne pouvez supprimer que vos messages');
        if (verdict === 'deleted') throw new ConflictError('Ce message est déjà supprimé');
        if (verdict === 'expired') throw new ConflictError('Le délai de suppression de 10 minutes est dépassé');

        const tombstone: MarketMessage = { ...message, body: '', attachments: [], deleted_at: at };
        const recipientId = other(current, userId);
        const wasUnread = message.created_at > (current.last_read_at?.[recipientId] ?? '');

        const next: MarketConversation = { ...current, updated_at: at };
        if (wasUnread && (current.unread[recipientId] ?? 0) > 0) {
          next.unread = { ...current.unread, [recipientId]: current.unread[recipientId] - 1 };
        }
        if (current.last_message?.message_id === messageId) {
          next.last_message = { ...current.last_message, preview: 'Message supprimé' };
        }
        tx.setMessage(tombstone);
        tx.setConversation(next);
        return tombstone;
      });
    },

    /** Marque la conversation comme lue : remet le compteur à zéro et alimente l'accusé « vu ». */
    async markRead(userId: string, conversationIdParam: string): Promise<void> {
      const conversation = await requireConversation(userId, conversationIdParam);
      const at = iso();
      await store.transact(conversation.id, async (tx) => {
        const current = await tx.getConversation();
        if (!current) return;
        if ((current.unread[userId] ?? 0) === 0 && current.last_read_at?.[userId] && current.last_message_at <= current.last_read_at[userId]) {
          return;
        }
        tx.setConversation({
          ...current,
          unread: { ...current.unread, [userId]: 0 },
          last_read_at: { ...current.last_read_at, [userId]: at },
        });
      });
    },

    async getConversation(userId: string, conversationIdParam: string) {
      return requireConversation(userId, conversationIdParam);
    },

    /** Signal de présence (« en ligne » / « vu il y a… »). */
    async heartbeat(userId: string): Promise<void> {
      await store.touchPresence(userId, iso());
    },

    async setBlock(userId: string, otherUserId: string, on: boolean): Promise<void> {
      if (userId === otherUserId) throw new ValidationError('Action impossible sur votre propre compte');
      if (!(await directory.getParticipant(otherUserId))) throw new NotFoundError('Utilisateur introuvable');
      await store.setBlock(userId, otherUserId, on, iso());
    },

    async reportConversation(userId: string, conversationIdParam: string, input: { reason?: unknown; comment?: unknown }) {
      const conversation = await requireConversation(userId, conversationIdParam);
      const reason = parseReportReason(input.reason);
      const comment = parseOptionalComment(input.comment);

      const recent = await store.listRecentMessages(conversation.id, 30);
      const report: ConversationReport = {
        conversation_id: conversation.id,
        reporter_id: userId,
        reported_user_id: other(conversation, userId),
        reason,
        comment,
        evidence: recent.map(({ id, sender_id, body, attachments, created_at, deleted_at }) => ({
          id, sender_id, body, attachments, created_at, deleted_at,
        })),
        status: 'open',
        type: 'conversation',
        created_at: iso(),
      };
      await store.saveReport(report);
    },
  };
}

export type MessagingService = ReturnType<typeof createMessagingService>;
