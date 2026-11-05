// Tests de la messagerie sans Firestore : store, annuaire, notifieur et horloge sont des faux injectés.
// Exécution : npx tsx src/lib/market/__tests__/messaging.test.ts

import assert from 'node:assert/strict';
import { createMessagingService } from '../messaging-service';
import { ConversationTx, MessagingStore } from '../messaging-ports';
import {
  EDIT_WINDOW_MS,
  RATE_LIMITS,
  RateState,
  conversationId,
  decideRate,
  isOnline,
  isSeenBy,
  shouldSendEmail,
} from '../messaging-rules';
import { containsExternalLink, normalizeBody, parseAttachments } from '../messaging-validation';
import { ConversationReport, MarketConversation, MarketMessage } from '../messaging-types';
import { ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError, ValidationError } from '../errors';

const CLOUD = 'democloud';
const IMG = `https://res.cloudinary.com/${CLOUD}/image/upload/v1/leoui_market/a.jpg`;

function setup() {
  let nowMs = Date.parse('2025-11-03T10:00:00.000Z');
  const convs = new Map<string, MarketConversation>();
  const msgs = new Map<string, MarketMessage>(); // clé `${conv}/${id}`
  const presence = new Map<string, string>();
  const blocks = new Set<string>();
  const rates = new Map<string, RateState>();
  const reports: ConversationReport[] = [];
  const emails: { recipientId: string; senderName: string }[] = [];
  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

  const store: MessagingStore = {
    async transact<T>(cid: string, fn: (tx: ConversationTx) => Promise<T>) {
      const pendingConv: MarketConversation[] = [];
      const pendingMsgs: MarketMessage[] = [];
      let wrote = false;
      const tx: ConversationTx = {
        async getConversation() {
          if (wrote) throw new Error('lecture après écriture : interdit par Firestore');
          return convs.has(cid) ? clone(convs.get(cid)!) : null;
        },
        async getMessage(id) {
          if (wrote) throw new Error('lecture après écriture : interdit par Firestore');
          return msgs.has(`${cid}/${id}`) ? clone(msgs.get(`${cid}/${id}`)!) : null;
        },
        setConversation(c) { wrote = true; pendingConv.push(clone(c)); },
        setMessage(m) { wrote = true; pendingMsgs.push(clone(m)); },
      };
      const result = await fn(tx); // rien n'est appliqué si fn lève
      pendingConv.forEach((c) => convs.set(cid, c));
      pendingMsgs.forEach((m) => msgs.set(`${cid}/${m.id}`, m));
      return result;
    },
    async getConversation(id) { return convs.has(id) ? clone(convs.get(id)!) : null; },
    async listRecentMessages(cid, limit) {
      return [...msgs.entries()].filter(([k]) => k.startsWith(`${cid}/`)).map(([, m]) => clone(m))
        .sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-limit);
    },
    async getLastSeen(uid) { return presence.get(uid) ?? null; },
    async touchPresence(uid, iso) { presence.set(uid, iso); },
    async isBlockedEitherWay(a, b) { return blocks.has(`${a}_${b}`) || blocks.has(`${b}_${a}`); },
    async setBlock(blocker, blocked, on) {
      if (on) blocks.add(`${blocker}_${blocked}`); else blocks.delete(`${blocker}_${blocked}`);
      convs.forEach((c) => {
        if (!c.participant_ids.includes(blocker) || !c.participant_ids.includes(blocked)) return;
        if (on) c.blocked_by = blocker; else if (c.blocked_by === blocker) c.blocked_by = null;
      });
    },
    async consumeRate(uid, bucket, ms) {
      const key = `${uid}_${bucket}`;
      const { allowed, next } = decideRate(rates.get(key) ?? null, ms, RATE_LIMITS[bucket]);
      if (allowed) rates.set(key, next);
      return allowed;
    },
    async saveReport(r) { reports.push(clone(r)); },
  };

  const users: Record<string, { display_name: string; photo_url: string | null }> = {
    buyer: { display_name: 'Camille', photo_url: null },
    seller: { display_name: 'Anthony', photo_url: null },
    stranger: { display_name: 'Intrus', photo_url: null },
  };
  const service = createMessagingService({
    store,
    cloudName: CLOUD,
    clock: () => nowMs,
    directory: {
      async getParticipant(uid) { return users[uid] ?? null; },
      async getListing(id) {
        return id === 'L1'
          ? { id: 'L1', seller_id: 'seller', title: 'Arche dorée', image: null, price: 120, slug: 'arche', status: 'active' }
          : null;
      },
      async hasSellerProfile(uid) { return uid === 'seller'; },
    },
    notifier: { async notifyNewMessage(n) { emails.push({ recipientId: n.recipientId, senderName: n.senderName }); } },
  });

  return { service, convs, msgs, presence, reports, emails, advance: (ms: number) => { nowMs += ms; } };
}

async function rejects(p: Promise<unknown>, E: new (...a: any[]) => Error, label: string) {
  try { await p; } catch (e) { assert.ok(e instanceof E, `${label} : mauvaise erreur (${(e as Error).constructor.name}: ${(e as Error).message})`); return; }
  assert.fail(`${label} : aucune erreur levée`);
}

async function main() {
  // ── règles pures ─────────────────────────────────────────────────────────
  assert.equal(conversationId('a', 'b', 'L1'), 'a_b_L1');
  assert.equal(conversationId('b', 'a', null), conversationId('a', 'b', null)); // même fil dans les deux sens
  const t0 = Date.parse('2025-11-03T10:00:00.000Z');
  assert.equal(isOnline('2025-11-03T09:59:00.000Z', t0), true);
  assert.equal(isOnline('2025-11-03T09:50:00.000Z', t0), false);
  assert.equal(isOnline(null, t0), false);
  assert.equal(isSeenBy({ created_at: '2025-11-03T10:00:00.000Z' }, '2025-11-03T10:01:00.000Z'), true);
  assert.equal(isSeenBy({ created_at: '2025-11-03T10:02:00.000Z' }, '2025-11-03T10:01:00.000Z'), false);
  assert.equal(shouldSendEmail({ recipientLastSeen: null, lastNotifiedAt: null, nowMs: t0 }), true);
  assert.equal(shouldSendEmail({ recipientLastSeen: '2025-11-03T09:59:30.000Z', lastNotifiedAt: null, nowMs: t0 }), false);
  assert.equal(shouldSendEmail({ recipientLastSeen: null, lastNotifiedAt: '2025-11-03T09:55:00.000Z', nowMs: t0 }), false);
  assert.equal(decideRate({ window_start: t0, count: 30 }, t0 + 1000, RATE_LIMITS.message).allowed, false);
  assert.equal(decideRate({ window_start: t0, count: 30 }, t0 + 61_000, RATE_LIMITS.message).allowed, true);
  console.log('✅ règles : identifiant de fil, présence, vu, quotas, cooldown email');

  // ── validation ─────────────────────────────────────────────────────────
  assert.equal(normalizeBody('  a\r\n\r\n\r\n\r\nb \u202E '), 'a\n\nb');
  assert.equal(containsExternalLink('Mon mail : sophie@gmail.com, tel 06 12 34 56 78'), false); // coordonnées OK
  assert.equal(containsExternalLink('Voir https://exemple.fr/x'), true);
  assert.equal(containsExternalLink('regarde www.truc.com'), true);
  assert.equal(containsExternalLink('ecris moi sur wa.me/33612345678'), true);
  assert.equal(containsExternalLink('Bonjour, est-elle toujours disponible ?'), false);
  assert.deepEqual(parseAttachments([IMG], CLOUD), [{ url: IMG }]);
  assert.throws(() => parseAttachments(['https://evil.com/x.png'], CLOUD), ValidationError);
  assert.throws(() => parseAttachments([`https://res.cloudinary.com/autre/image/upload/x.jpg`], CLOUD), ValidationError);
  assert.throws(() => parseAttachments([IMG, IMG, IMG, IMG], CLOUD), ValidationError);
  assert.throws(() => parseAttachments([IMG], undefined), ValidationError); // échec fermé
  console.log('✅ validation : liens externes refusés, coordonnées permises, photos limitées à notre Cloudinary');

  // ── démarrage d'une conversation ─────────────────────────────────────────
  const { service, convs, msgs, presence, reports, emails, advance } = setup();

  await rejects(service.startConversation('seller', { listing_id: 'L1', body: 'Salut', client_id: 'client-0001' }), ForbiddenError, 'écrire à soi-même');
  await rejects(service.startConversation('buyer', { listing_id: 'nope', body: 'Salut', client_id: 'client-0001' }), NotFoundError, 'annonce inconnue');
  await rejects(service.startConversation('buyer', { listing_id: 'L1', body: '   ', client_id: 'client-0001' }), ValidationError, 'message vide');
  await rejects(service.startConversation('buyer', { listing_id: 'L1', body: 'va sur www.arnaque.com', client_id: 'client-0001' }), ValidationError, 'lien externe');
  await rejects(service.startConversation('buyer', { listing_id: 'L1', body: 'Salut', client_id: 'x' }), ValidationError, 'client_id invalide');

  const first = await service.startConversation('buyer', { listing_id: 'L1', body: 'Bonjour,\nest-elle disponible ?', client_id: 'client-0001', attachments: [IMG] });
  const cid = first.conversation.id;
  assert.equal(cid, 'buyer_seller_L1');
  assert.equal(first.message.body, 'Bonjour,\nest-elle disponible ?'); // saut de ligne conservé
  assert.equal(first.conversation.unread.seller, 1);
  assert.equal(first.conversation.unread.buyer, 0);
  assert.equal(first.conversation.participants.seller.display_name, 'Anthony');
  assert.equal(first.conversation.listing_snapshot?.title, 'Arche dorée');
  console.log('✅ démarrage : fil créé, non-lu côté vendeur, snapshot annonce');

  const retry = await service.startConversation('buyer', { listing_id: 'L1', body: 'Bonjour,\nest-elle disponible ?', client_id: 'client-0001', attachments: [IMG] });
  assert.equal(retry.created, false);
  assert.equal([...msgs.keys()].length, 1);
  assert.equal(convs.get(cid)!.unread.seller, 1); // pas de double comptage
  console.log('✅ idempotence : un double envoi ne crée pas de doublon');

  // ── notification email ─────────────────────────────────────────────────
  assert.equal(emails.length, 1);
  assert.equal(emails[0].recipientId, 'seller');
  await service.sendMessage('buyer', cid, { body: 'Ça m’intéresse', client_id: 'client-0002' });
  assert.equal(emails.length, 1); // cooldown 15 min
  advance(16 * 60 * 1000);
  await service.sendMessage('buyer', cid, { body: 'Toujours là ?', client_id: 'client-0003' });
  assert.equal(emails.length, 2);
  await service.heartbeat('seller'); // vendeur en ligne
  advance(16 * 60 * 1000);
  presence.set('seller', new Date(Date.parse('2025-11-03T10:32:00.000Z') + 0).toISOString());
  await service.sendMessage('buyer', cid, { body: 'Hello ?', client_id: 'client-0004' });
  assert.equal(emails.length, 2); // destinataire en ligne : pas d'email
  console.log('✅ notifications : 1 email max / 15 min, aucun si le destinataire est en ligne');

  // ── accès, lecture, vu ─────────────────────────────────────────────────
  await rejects(service.sendMessage('stranger', cid, { body: 'coucou', client_id: 'client-0005' }), NotFoundError, 'tiers qui écrit');
  await rejects(service.getConversation('stranger', cid), NotFoundError, 'tiers qui lit');
  assert.equal(convs.get(cid)!.unread.seller, 4);
  await service.markRead('seller', cid);
  assert.equal(convs.get(cid)!.unread.seller, 0);
  assert.ok(convs.get(cid)!.last_read_at.seller);
  console.log('✅ accès : un tiers ne voit ni n’écrit ; lecture remet le compteur à zéro');

  // ── modification / suppression, fenêtre de 10 minutes ────────────────────
  const m = await service.sendMessage('seller', cid, { body: 'Oui, dispo !', client_id: 'client-0006' });
  const edited = await service.editMessage('seller', cid, m.message.id, 'Oui, disponible !');
  assert.equal(edited.body, 'Oui, disponible !');
  assert.ok(edited.edited_at);
  assert.equal(convs.get(cid)!.last_message!.preview, 'Oui, disponible !');
  await rejects(service.editMessage('buyer', cid, m.message.id, 'piraté'), ForbiddenError, 'modifier le message d’un autre');
  await rejects(service.editMessage('seller', cid, m.message.id, 'voir www.x.com'), ValidationError, 'modifier avec un lien');

  advance(EDIT_WINDOW_MS - 1000);
  assert.equal((await service.editMessage('seller', cid, m.message.id, 'Encore ok')).body, 'Encore ok');
  advance(2000); // > 10 min
  await rejects(service.editMessage('seller', cid, m.message.id, 'trop tard'), ConflictError, 'modification après 10 min');
  await rejects(service.deleteMessage('seller', cid, m.message.id), ConflictError, 'suppression après 10 min');
  console.log('✅ fenêtre : modification OK jusqu’à 10 min, refusée au-delà, réservée à l’auteur');

  const fresh = await service.sendMessage('buyer', cid, { body: 'Message à retirer', client_id: 'client-0007' });
  assert.equal(convs.get(cid)!.unread.seller, 1);
  const gone = await service.deleteMessage('buyer', cid, fresh.message.id);
  assert.equal(gone.body, '');
  assert.deepEqual(gone.attachments, []);
  assert.ok(gone.deleted_at);
  assert.equal(convs.get(cid)!.last_message!.preview, 'Message supprimé');
  assert.equal(convs.get(cid)!.unread.seller, 0); // non lu retiré du compteur
  await rejects(service.editMessage('buyer', cid, fresh.message.id, 'ressuscité'), ConflictError, 'modifier un message supprimé');
  console.log('✅ suppression : contenu effacé, aperçu et compteur corrigés');

  // ── quotas ──────────────────────────────────────────────────────────────
  const spam = setup();
  const sp = await spam.service.startConversation('buyer', { listing_id: 'L1', body: 'start', client_id: 'spam-000001' });
  let blocked = false;
  for (let i = 0; i < 40 && !blocked; i++) {
    try { await spam.service.sendMessage('buyer', sp.conversation.id, { body: `m${i}`, client_id: `spam-msg-${String(i).padStart(4, '0')}` }); }
    catch (e) { assert.ok(e instanceof TooManyRequestsError); blocked = true; }
  }
  assert.ok(blocked, 'le quota de messages doit se déclencher');
  spam.advance(61_000);
  await spam.service.sendMessage('buyer', sp.conversation.id, { body: 'ok après la fenêtre', client_id: 'spam-after-01' });
  console.log('✅ quota : 30 messages/min maximum, reprise après la fenêtre');

  // ── blocage ────────────────────────────────────────────────────────────
  await service.setBlock('seller', 'buyer', true);
  assert.equal(convs.get(cid)!.blocked_by, 'seller');
  await rejects(service.sendMessage('buyer', cid, { body: 'allô ?', client_id: 'client-0008' }), ForbiddenError, 'écrire à qui m’a bloqué');
  await rejects(service.sendMessage('seller', cid, { body: 'hé', client_id: 'client-0009' }), ForbiddenError, 'écrire à qui j’ai bloqué');
  await rejects(service.startConversation('buyer', { seller_id: 'seller', body: 'contournement', client_id: 'client-0010' }), ForbiddenError, 'contourner via le profil');
  await service.setBlock('seller', 'buyer', false);
  await service.sendMessage('buyer', cid, { body: 'revenu', client_id: 'client-0011' });
  console.log('✅ blocage : bilatéral, non contournable via le profil, réversible');

  // ── contact depuis le profil ───────────────────────────────────────────
  const profile = await service.startConversation('buyer', { seller_id: 'seller', body: 'Avez-vous d’autres articles ?', client_id: 'client-0012' });
  assert.equal(profile.conversation.listing_id, null);
  assert.equal(profile.conversation.id, 'buyer_seller_profile');
  await rejects(service.startConversation('buyer', { seller_id: 'stranger', body: 'x', client_id: 'client-0013' }), NotFoundError, 'profil sans vendeur');
  console.log('✅ profil : conversation sans annonce, réservée aux vrais vendeurs');

  // ── signalement : la preuve survit à la suppression ─────────────────────
  const bad = await service.sendMessage('buyer', cid, { body: 'propos abusif', client_id: 'client-0014' });
  await service.reportConversation('seller', cid, { reason: 'harcelement', comment: 'insultes' });
  await service.deleteMessage('buyer', cid, bad.message.id);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].reported_user_id, 'buyer');
  assert.ok(reports[0].evidence.some((e) => e.body === 'propos abusif'));
  await rejects(service.reportConversation('seller', cid, { reason: 'nimporte' }), ValidationError, 'motif de signalement invalide');
  console.log('✅ signalement : copie des messages conservée même si l’auteur les supprime ensuite');

  console.log('🎉 TOUS LES TESTS MESSAGERIE ONT RÉUSSI');
}

main().catch((e) => {
  console.error('❌ Échec :', e);
  process.exit(1);
});
