// Tests des règles Market sans Firestore (fake en mémoire).
// Exécution : npx tsx src/lib/market/__tests__/market-rules.test.ts

import assert from 'node:assert/strict';
import { createDisputeService, canOpenDispute } from '../dispute-service';
import { createOrderService } from '../order-service';
import { ConflictError, ForbiddenError, ValidationError } from '../errors';
import { formatLocation, sellerNetFromAmounts, splitCityLabel, stripUndefined } from '../utils';

// ── Fake Firestore minimal : collections, where(==), transactions ───────────────
function makeDb(seed: Record<string, Record<string, any>>) {
  const data: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(seed));
  let n = 0;
  const clone = (v: any) => JSON.parse(JSON.stringify(v));
  const snap = (col: string, id: string) => ({
    exists: !!data[col]?.[id],
    id,
    data: () => clone(data[col][id]),
  });
  const docRef = (col: string, id: string) => ({
    id,
    get: async () => snap(col, id),
    set: async (d: any) => {
      (data[col] ??= {})[id] = clone(d);
    },
    update: async (p: any) => {
      Object.assign(data[col][id], clone(p));
    },
  });
  const query = (col: string, filters: [string, any][]): any => ({
    where: (f: string, _op: string, v: any) => query(col, [...filters, [f, v]]),
    limit: () => query(col, filters),
    get: async () => {
      const docs = Object.keys(data[col] ?? {})
        .filter((id) => filters.every(([f, v]) => data[col][id][f] === v))
        .map((id) => snap(col, id));
      return { docs, empty: docs.length === 0 };
    },
  });
  const db: any = {
    collection: (col: string) => ({
      doc: (id: string = `id${++n}`) => docRef(col, id),
      where: (f: string, _op: string, v: any) => query(col, [[f, v]]),
    }),
    runTransaction: async (fn: any) =>
      fn({
        get: (x: any) => x.get(),
        set: (ref: any, d: any) => ref.set(d),
        update: (ref: any, p: any) => ref.update(p),
      }),
  };
  return { db, data };
}

async function rejects(p: Promise<unknown>, ErrorClass: new (...a: any[]) => Error, label: string) {
  try {
    await p;
  } catch (e) {
    assert.ok(e instanceof ErrorClass, `${label} : mauvaise erreur (${(e as Error).constructor.name})`);
    return;
  }
  assert.fail(`${label} : aucune erreur levée`);
}

async function main() {
  // ── utils ──────────────────────────────────────────────────────────────────
  assert.deepEqual(splitCityLabel('Ris-Orangis (91130)'), { city: 'Ris-Orangis', postal: '91130' });
  assert.deepEqual(splitCityLabel('Lyon'), { city: 'Lyon' });
  assert.equal(formatLocation('Ris-Orangis (91130)', '91130'), 'Ris-Orangis (91130)'); // pas de doublon
  assert.equal(formatLocation('Lyon', '69002'), 'Lyon (69002)');
  assert.equal(sellerNetFromAmounts({ items: 100, shipping: 10 }), 102); // 110 − 8 % de 100
  assert.deepEqual(stripUndefined({ a: 1, b: undefined, c: { d: undefined, e: null } }), { a: 1, c: { e: null } });
  console.log('✅ utils : localisation sans doublon, net vendeur, nettoyage des undefined');

  // ── règles pures ───────────────────────────────────────────────────────────
  assert.equal(canOpenDispute({ order_status: 'shipped' }), true);
  assert.equal(canOpenDispute({ order_status: 'completed' }), false);
  assert.equal(canOpenDispute({ order_status: 'disputed' }), false);
  console.log('✅ règles : un litige ne s’ouvre pas sur une commande terminée');

  // ── cycle de vie d'un litige ───────────────────────────────────────────────
  const { db, data } = makeDb({
    market_orders: {
      o1: {
        id: 'o1',
        buyer_id: 'buyer',
        seller_id: 'seller',
        order_status: 'shipped',
        listing_snapshot: { title: 'Arche dorée', image: 'x.jpg', price: 100 },
        history: [],
      },
    },
    market_disputes: {},
    market_payments: {},
  });
  const disputes = createDisputeService(db);
  const orders = createOrderService(db);
  const valid = { order_id: 'o1', reason: 'damaged', description: 'Un pied est cassé à la réception.' };

  await rejects(disputes.open('seller', valid), ForbiddenError, 'ouverture par le vendeur');
  await rejects(disputes.open('buyer', { ...valid, reason: 'nope' }), ValidationError, 'motif invalide');
  await rejects(disputes.open('buyer', { ...valid, description: 'court' }), ValidationError, 'description trop courte');

  const d = await disputes.open('buyer', valid);
  assert.equal(d.status, 'awaiting_seller');
  assert.equal(data.market_orders.o1.order_status, 'disputed');
  assert.equal(data.market_orders.o1.status_before_dispute, 'shipped');
  console.log('✅ ouverture : litige créé, commande passée en « disputed »');

  await rejects(disputes.open('buyer', valid), ConflictError, 'second litige simultané');
  await rejects(orders.confirmReceipt('buyer', 'o1'), ConflictError, 'confirmation pendant un litige');
  console.log('✅ garde-fou : impossible de libérer les fonds pendant un litige');

  await rejects(disputes.addMessage('intrus', d.id, 'coucou'), ForbiddenError, 'message d’un tiers');
  const afterSeller = await disputes.addMessage('seller', d.id, 'Je propose un remboursement partiel.');
  assert.equal(afterSeller.status, 'under_review');
  assert.equal(afterSeller.seller_response, 'Je propose un remboursement partiel.');
  assert.equal(afterSeller.messages.length, 2);
  console.log('✅ échange : réponse du vendeur → dossier « en cours d’examen »');

  await rejects(disputes.withdraw('seller', d.id), ForbiddenError, 'retrait par le vendeur');
  const closed = await disputes.withdraw('buyer', d.id);
  assert.equal(closed.status, 'closed');
  assert.equal(data.market_orders.o1.order_status, 'shipped');
  await rejects(disputes.addMessage('buyer', d.id, 'encore'), ConflictError, 'message sur litige clos');
  console.log('✅ retrait : litige clos, commande restaurée à son statut d’avant');

  console.log('🎉 TOUS LES TESTS MARKET (règles + litiges) ONT RÉUSSI');
}

main().catch((e) => {
  console.error('❌ Échec :', e);
  process.exit(1);
});
