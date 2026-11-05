// Tests E2E du flux Escrow LeOui Market — couvre les 5 scénarios testés manuellement :
//   1. Achat → order.status = 'paid' + fonds bloqués (payout_pending)
//   2. Vendeur : saisie du suivi colis → 'shipped' + tracking visible
//   3. Vendeur : code remise en main propre → 'completed' + payout
//   4. Acheteur : « J'ai reçu le colis » → 'completed' + libération
//   5. Litige → arbitrage admin (buyer = refund / seller = libération + message admin)
//
// Exécution : npx tsx src/lib/market/__tests__/escrow-full-flow.test.ts

import assert from 'node:assert/strict';
import { createOrderService } from '../order-service';
import { createDisputeService } from '../dispute-service';
import { ConflictError, ForbiddenError, ValidationError } from '../errors';

// ── Fake Firestore : collections, where(==), limit, transactions ─────────────
// Les docs retournés par les queries portent un `ref` avec update/set —
// indispensable car les services écrivent via paymentDoc.ref / orderRef.
function makeDb(seed: Record<string, Record<string, any>>) {
  const data: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(seed));
  let n = 0;
  const clone = (v: any) => JSON.parse(JSON.stringify(v));

  const docRef = (col: string, id: string): any => ({
    id,
    get: async () => ({
      exists: !!data[col]?.[id],
      id,
      data: () => clone(data[col]?.[id]),
    }),
    set: async (d: any) => { (data[col] ??= {})[id] = clone(d); },
    update: async (p: any) => { Object.assign(data[col][id], clone(p)); },
  });

  const snap = (col: string, id: string) => ({
    exists: !!data[col]?.[id],
    id,
    ref: docRef(col, id),
    data: () => clone(data[col]?.[id]),
  });

  const query = (col: string, filters: [string, any][]): any => ({
    where: (f: string, _op: string, v: any) => query(col, [...filters, [f, v]]),
    limit: () => query(col, filters),
    get: async () => {
      const docs = Object.keys(data[col] ?? {})
        .filter((id) => filters.every(([f, v]) => data[col][id]?.[f] === v))
        .map((id) => snap(col, id));
      return { docs, empty: docs.length === 0 };
    },
  });

  const db: any = {
    collection: (col: string) => ({
      doc: (id: string = `id${++n}`) => docRef(col, id),
      where: (f: string, _op: string, v: any) => query(col, [[f, v]]),
      get: async () => ({
        docs: Object.keys(data[col] ?? {}).map((id) => snap(col, id)),
        empty: Object.keys(data[col] ?? {}).length === 0,
      }),
    }),
    // Transaction naïve : lecture directe, écritures immédiates via les refs.
    // Suffisant pour nos services qui font get → set/update séquentiels.
    runTransaction: async (fn: any) =>
      fn({
        get: (x: any) => x.get(),
        set: (ref: any, d: any) => ref.set(d),
        update: (ref: any, p: any) => ref.update(p),
      }),
  };
  return { db, data };
}

// ── Fixture de base : une annonce shipping+pickup + collections vides ────────
const seedListing = (overrides: Record<string, any> = {}) => ({
  market_listings: {
    L1: {
      id: 'L1', seller_id: 'seller_alice', title: 'Arche de mariage',
      price: 150, quantity: 2, quantity_reserved: 0, status: 'active',
      images: ['arche.jpg'],
      delivery: { shipping: true, shipping_cost: 15, pickup: true },
      ...overrides,
    },
  },
  market_orders: {},
  market_payments: {},
  market_payouts: {},
  market_disputes: {},
});

const SHIPPING_ADDR = {
  full_name: 'Bob Martin', street: '10 rue des Fleurs',
  city: 'Paris', postal_code: '75001', country: 'France',
};

async function main() {
  const orders = (db: any) => createOrderService(db);
  const disputes = (db: any) => createDisputeService(db);

  // ════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 1 — Achat : commande payée + fonds bloqués sous séquestre
  // ════════════════════════════════════════════════════════════════════════
  {
    const { db, data } = makeDb(seedListing());
    const { order, payment } = await orders(db).createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1,
      delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR,
    });

    assert.equal(order.order_status, 'paid', 'La commande doit être payée');
    assert.equal(payment.payment_status, 'payout_pending', 'Les fonds doivent être bloqués sous séquestre');
    // 150 + 15 livraison + 5% de 150 (7.5) = 172.5
    assert.equal(order.amounts.total, 172.5);
    // Commission 8% sur items (12) → net vendeur = 150+15−12 = 153
    assert.equal(payment.seller_net, 153);
    assert.deepEqual(
      order.history.map((h: any) => h.status),
      ['pending_payment', 'paid'],
    );
    assert.equal(data.market_listings.L1.quantity, 1, 'Le stock doit être décrémenté');

    // Gardes : achat de sa propre annonce / stock insuffisant
    await assert.rejects(
      orders(db).createOrder('seller_alice', { listing_id: 'L1', quantity: 1, delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR }),
      ForbiddenError,
    );
    await assert.rejects(
      orders(db).createOrder('buyer_bob', { listing_id: 'L1', quantity: 99, delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR }),
      ConflictError,
    );
    console.log('✅ 1. Achat → order paid + fonds bloqués (séquestre) + montants OK + gardes');
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 2 — Vendeur : saisie du suivi colis → affiché côté acheteur
  // ════════════════════════════════════════════════════════════════════════
  {
    const { db } = makeDb(seedListing());
    const svc = orders(db);
    const { order } = await svc.createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1,
      delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR,
    });

    const shipped = await svc.shipOrder('seller_alice', {
      order_id: order.id, carrier: 'Colissimo', tracking_number: '6A12345678',
    });

    assert.equal(shipped.order_status, 'shipped');
    assert.equal(shipped.tracking?.carrier, 'Colissimo');
    assert.equal(shipped.tracking?.number, '6A12345678');
    assert.ok(shipped.tracking?.shipped_at, 'Date d’expédition requise');
    assert.ok(shipped.history.some((h: any) => h.status === 'shipped'));

    // Gardes : seul le vendeur, seulement depuis paid/preparing
    await assert.rejects(
      svc.shipOrder('buyer_bob', { order_id: order.id, carrier: 'X', tracking_number: 'Y' }),
      ForbiddenError,
    );
    await assert.rejects(
      svc.shipOrder('seller_alice', { order_id: order.id, carrier: 'X', tracking_number: 'Y' }),
      ConflictError, // déjà shipped
    );
    console.log('✅ 2. Suivi colis → shipped + tracking enregistré + gardes');
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 3 — Remise en main propre : code vendeur → completed + payout
  // ════════════════════════════════════════════════════════════════════════
  {
    const { db } = makeDb(seedListing());
    const svc = orders(db);
    const { order, payment } = await svc.createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1, delivery_mode: 'pickup',
    });

    assert.match(order.pickup_code!, /^\d{6}$/, 'Un code à 6 chiffres doit être généré');

    // Mauvais code → ValidationError
    await assert.rejects(
      svc.confirmPickup('seller_alice', order.id, '000000'),
      ValidationError,
    );
    // L'acheteur ne peut pas saisir le code (réservé au vendeur)
    await assert.rejects(
      svc.confirmPickup('buyer_bob', order.id, order.pickup_code!),
      ForbiddenError,
    );

    const { order: done, payout } = await svc.confirmPickup('seller_alice', order.id, order.pickup_code!);

    assert.equal(done.order_status, 'completed');
    assert.ok(done.receipt_confirmed_at, 'Date de confirmation requise');
    assert.equal(payout.payout_status, 'requested', 'Le virement doit être demandé');
    assert.equal(payout.amount, payment.seller_net, 'Le payout = net vendeur');
    assert.equal(payout.seller_id, 'seller_alice');
    console.log('✅ 3. Remise en main propre → code validé → completed + payout');
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 4 — Acheteur : « J'ai reçu le colis » → libération des fonds
  // ════════════════════════════════════════════════════════════════════════
  {
    const { db } = makeDb(seedListing());
    const svc = orders(db);
    const { order, payment } = await svc.createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1,
      delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR,
    });
    await svc.shipOrder('seller_alice', {
      order_id: order.id, carrier: 'Colissimo', tracking_number: '6A12345678',
    });

    const { order: done, payout } = await svc.confirmReceipt('buyer_bob', order.id);

    assert.equal(done.order_status, 'completed');
    assert.ok(done.receipt_confirmed_at);
    assert.equal(payout.payout_status, 'requested');
    assert.equal(payout.amount, payment.seller_net);

    // Gardes : seul l'acheteur, idempotence (double confirmation refusée)
    const { order: other } = await svc.createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1,
      delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR,
    }).catch(() => ({ order: null as any, payment: null as any }));

    if (other) {
      await assert.rejects(
        svc.confirmReceipt('seller_alice', other.id),
        ForbiddenError,
      );
    }
    await assert.rejects(
      svc.confirmReceipt('buyer_bob', order.id),
      ConflictError, // déjà confirmée
    );
    console.log('✅ 4. Réception confirmée → completed + fonds libérés + gardes');
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCÉNARIO 5 — Litige → arbitrage admin (acheteur = refund / vendeur = payout)
  // ════════════════════════════════════════════════════════════════════════
  {
    const { db, data } = makeDb(seedListing());
    const svc = orders(db);
    const dsvc = disputes(db);

    // ── 5a : litige tranché en faveur de l'ACHETEUR → remboursement ──────────
    const { order: o1 } = await svc.createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1,
      delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR,
    });

    const dispute = await dsvc.open('buyer_bob', {
      order_id: o1.id, reason: 'not_received',
      description: 'Colis déclaré livré mais jamais reçu chez moi.',
    });

    assert.equal(dispute.status, 'awaiting_seller');
    assert.equal(dispute.messages[0].role, 'buyer');

    // La commande est gelée : fonds toujours bloqués, réception impossible
    assert.equal(data.market_orders[o1.id].order_status, 'disputed');
    assert.equal(data.market_orders[o1.id].status_before_dispute, 'paid');
    await assert.rejects(svc.confirmReceipt('buyer_bob', o1.id), ConflictError);

    // Double ouverture refusée
    await assert.rejects(
      dsvc.open('buyer_bob', { order_id: o1.id, reason: 'damaged', description: 'Encore un litige sur cette commande.' }),
      ConflictError,
    );

    // Le vendeur répond → passage en examen
    const afterSeller = await dsvc.addMessage('seller_alice', dispute.id, 'J\'ai bien une preuve de dépôt Colissimo.');
    assert.equal(afterSeller.status, 'under_review');
    assert.equal(afterSeller.messages[1].role, 'seller');

    // L'admin tranche pour l'acheteur → refund
    const resolved = await dsvc.resolve('admin_1', dispute.id, {
      decision: 'buyer',
      note: 'Aucune preuve de livraison valable fournie par le vendeur.',
    });

    assert.equal(resolved.status, 'resolved_buyer');
    assert.equal(resolved.decided_by, 'admin_1');
    assert.ok(resolved.decided_at);
    // Message admin tracé dans le fil
    const adminMsg = resolved.messages[resolved.messages.length - 1];
    assert.equal(adminMsg.role, 'admin');
    assert.match(adminMsg.body, /^\[Arbitrage\]/);

    // Effets sur order + payment
    assert.equal(data.market_orders[o1.id].order_status, 'refunded');
    const p1 = Object.values(data.market_payments).find((p: any) => p.order_id === o1.id) as any;
    assert.equal(p1.payment_status, 'refunded');
    assert.ok(p1.events.some((e: any) => e.type === 'refund_executed_dispute'));

    // Idempotence : re-trancher → ConflictError
    await assert.rejects(
      dsvc.resolve('admin_1', dispute.id, { decision: 'seller', note: 'Tentative de re-décision.' }),
      ConflictError,
    );
    // Message sur litige clos refusé
    await assert.rejects(
      dsvc.addMessage('buyer_bob', dispute.id, 'Encore un mot'),
      ConflictError,
    );
    console.log('✅ 5a. Litige → arbitre acheteur → refunded + message admin tracé + idempotent');

    // ── 5b : litige tranché en faveur du VENDEUR → libération des fonds ──────
    const { db: db2, data: data2 } = makeDb(seedListing());
    const svc2 = orders(db2);
    const dsvc2 = disputes(db2);

    const { order: o2, payment: p2 } = await svc2.createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1,
      delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR,
    });
    await svc2.shipOrder('seller_alice', {
      order_id: o2.id, carrier: 'Colissimo', tracking_number: '6A12345678',
    });

    const d2 = await dsvc2.open('buyer_bob', {
      order_id: o2.id, reason: 'not_as_described',
      description: 'L\'article ne correspond pas exactement à la description.',
    });
    assert.equal(data2.market_orders[o2.id].status_before_dispute, 'shipped');

    await dsvc2.addMessage('seller_alice', d2.id, 'Photos de l\'annonce conformes au produit envoyé.');

    const resolved2 = await dsvc2.resolve('admin_1', d2.id, {
      decision: 'seller',
      note: 'L\'annonce décrivait fidèlement l\'article, vendeur de bonne foi.',
    });

    assert.equal(resolved2.status, 'resolved_seller');
    assert.equal(data2.market_orders[o2.id].order_status, 'completed');
    assert.ok(data2.market_orders[o2.id].receipt_confirmed_at);

    // Payout créé + payment libéré
    const payoutDocs = Object.values(data2.market_payouts);
    assert.equal(payoutDocs.length, 1, 'Un payout doit être créé');
    assert.equal((payoutDocs[0] as any).amount, p2.seller_net);
    assert.equal((payoutDocs[0] as any).payout_status, 'requested');
    const payDocs = Object.values(data2.market_payments);
    assert.equal((payDocs[0] as any).payment_status, 'payout_requested');

    // Message admin tracé
    const lastMsg = resolved2.messages[resolved2.messages.length - 1];
    assert.equal(lastMsg.role, 'admin');
    console.log('✅ 5b. Litige → arbitre vendeur → completed + payout libéré + message admin');

    // Note de résolution trop courte refusée
    const { db: db3 } = makeDb(seedListing());
    const svc3 = orders(db3);
    const dsvc3 = disputes(db3);
    const { order: o3 } = await svc3.createOrder('buyer_bob', {
      listing_id: 'L1', quantity: 1, delivery_mode: 'shipping', shipping_address: SHIPPING_ADDR,
    });
    const d3 = await dsvc3.open('buyer_bob', {
      order_id: o3.id, reason: 'other',
      description: 'Un troisième litige pour valider les gardes.',
    });
    await assert.rejects(
      dsvc3.resolve('admin_1', d3.id, { decision: 'buyer', note: 'court' }),
      ValidationError,
    );
    // Décision invalide
    await assert.rejects(
      dsvc3.resolve('admin_1', d3.id, { decision: 'nobody' as any, note: 'Une note assez longue.' }),
      ValidationError,
    );
    // Retrait par l'acheteur → commande restaurée
    const withdrawn = await dsvc3.withdraw('buyer_bob', d3.id);
    assert.equal(withdrawn.status, 'closed');
    assert.equal(withdrawn.messages[withdrawn.messages.length - 1].body, 'Litige retiré par l’acheteur.');
    console.log('✅ 5c. Gardes litige : note courte / décision invalide / retrait acheteur');
  }

  console.log('\n🎉 TOUS LES SCÉNARIOS DU FLUX ESCROW ONT RÉUSSI !');
}

main().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
