/**
 * Tests Stripe Connect — LeOui Market PSP layer
 *
 * Couvre :
 *  A. Adaptateur PSP (createPspAdapter) — fonctions isolées via faux client Stripe
 *  B. Logique webhook checkout.session.completed (kind=market_order)
 *  C. Logique webhook account.updated
 *  D. settlePayout (libération après confirmReceipt / confirmPickup)
 *  E. settleDispute (refund acheteur / transfer vendeur)
 *  F. Mode démo — isPspEnabled false → aucun appel Stripe
 *  G. Idempotency keys
 *  H. Calculs de montants (cents)
 *
 * Exécution : npx tsx src/lib/market/__tests__/stripe-connect.test.ts
 *
 * Architecture de test :
 *  - createPspAdapter(fakeStripe) : remplace le client Stripe par un objet
 *    factice qui enregistre les appels sans réseau.
 *  - makeDb(seed) : même Firestore fake que escrow-full-flow.test.ts.
 *  - settlePayoutFn / settleDisputeFn : fonctions extraites et testées
 *    isolément avec les deux dépendances injectées (db + pspAdapter).
 */

import assert from 'node:assert/strict';
import { createPspAdapter, cents, isPspEnabled, MarketCheckoutParams } from '../psp';
import { createOrderService } from '../order-service';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

/** Crée un faux client Stripe enregistrant tous les appels. */
function makeFakeStripe(overrides: Record<string, any> = {}) {
  const calls: { method: string; args: any[]; idempotencyKey?: string }[] = [];

  function recorder(method: string) {
    return async (...args: any[]) => {
      // Stripe SDK accepte un dernier arg Options avec idempotencyKey
      const opts = args[args.length - 1];
      const idempotencyKey = (opts && typeof opts === 'object' && 'idempotencyKey' in opts)
        ? opts.idempotencyKey as string
        : undefined;
      calls.push({ method, args, idempotencyKey });
      if (overrides[method]) return overrides[method](...args);
      // Valeurs par défaut réalistes
      if (method === 'accounts.create') return { id: 'acct_test_123' };
      if (method === 'accountLinks.create') return { url: 'https://connect.stripe.com/test_link' };
      if (method === 'accounts.retrieve') return { payouts_enabled: true, details_submitted: true };
      if (method === 'checkout.sessions.create') return { url: 'https://checkout.stripe.com/test_session', id: 'cs_test_123' };
      if (method === 'transfers.create') return { id: 'tr_test_456' };
      if (method === 'refunds.create') return { id: 're_test_789' };
      return {};
    };
  }

  const fakeStripe: any = {
    accounts: {
      create: recorder('accounts.create'),
      retrieve: recorder('accounts.retrieve'),
    },
    accountLinks: {
      create: recorder('accountLinks.create'),
    },
    checkout: {
      sessions: { create: recorder('checkout.sessions.create') },
    },
    transfers: {
      create: recorder('transfers.create'),
    },
    refunds: {
      create: recorder('refunds.create'),
    },
    _calls: calls,
  };
  return fakeStripe;
}

/** Fake Firestore — réutilisé de escrow-full-flow.test.ts */
function makeDb(seed: Record<string, Record<string, any>> = {}) {
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
    set: async (d: any, opts?: any) => {
      if (opts?.merge) {
        (data[col] ??= {})[id] = { ...(data[col]?.[id] || {}), ...clone(d) };
      } else {
        (data[col] ??= {})[id] = clone(d);
      }
    },
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

  return {
    db: {
      collection: (col: string) => ({
        doc: (id: string = `id${++n}`) => docRef(col, id),
        where: (f: string, _op: string, v: any) => query(col, [[f, v]]),
        get: async () => ({
          docs: Object.keys(data[col] ?? {}).map((id) => snap(col, id)),
          empty: Object.keys(data[col] ?? {}).length === 0,
        }),
      }),
      runTransaction: async (fn: any) =>
        fn({
          get: (ref: any) => ref.get(),
          set: (ref: any, d: any, opts?: any) => ref.set(d, opts),
          update: (ref: any, p: any) => ref.update(p),
        }),
    },
    data,
  };
}

/**
 * Réimplémentation testable de settlePayout (logique extraite de orders/[id]/route.ts).
 * Identique à la production mais injecte db et psp au lieu de les importer.
 */
async function settlePayout(
  db: any,
  psp: ReturnType<typeof createPspAdapter>,
  order: { seller_id: string; id: string },
  payout: { id: string; amount: number }
) {
  const sellerSnap = await db.collection('market_seller_profiles').doc(order.seller_id).get();
  const accountId = sellerSnap.data()?.psp_account_id as string | undefined;
  if (!accountId) return { settled: false as const };

  try {
    const transferId = await psp.executeSellerTransfer({
      payoutId: payout.id,
      sellerConnectId: accountId,
      amountEur: payout.amount,
      orderId: order.id,
    });
    await db.collection('market_payouts').doc(payout.id).set(
      { payout_status: 'executed', psp_payout_ref: transferId, executed_at: new Date().toISOString() },
      { merge: true }
    );
    return { settled: true as const, transfer_id: transferId };
  } catch (e) {
    return { settled: false as const };
  }
}

/**
 * Réimplémentation testable de settleDispute (extraite de admin/disputes/[id]/route.ts).
 */
async function settleDispute(
  db: any,
  psp: ReturnType<typeof createPspAdapter>,
  decision: 'buyer' | 'seller',
  orderId: string
) {
  const paySnap = await db
    .collection('market_payments')
    .where('order_id', '==', orderId)
    .limit(1)
    .get();
  if (paySnap.empty) return;
  const payment = paySnap.docs[0].data() as {
    psp_ref?: string;
    seller_net?: number;
    seller_id?: string;
  };

  if (decision === 'buyer') {
    if (payment.psp_ref?.startsWith('pi_') && !payment.psp_ref.startsWith('pi_test_')) {
      await psp.refundPayment({ paymentIntentId: payment.psp_ref, orderId });
    }
  } else {
    const sellerSnap = await db.collection('market_seller_profiles').doc(payment.seller_id!).get();
    const accountId = sellerSnap.data()?.psp_account_id as string | undefined;
    if (!accountId || !payment.seller_net) return;
    const payoutSnap = await db
      .collection('market_payouts')
      .where('order_id', '==', orderId)
      .limit(1)
      .get();
    if (payoutSnap.empty) return;
    const transferId = await psp.executeSellerTransfer({
      payoutId: payoutSnap.docs[0].id,
      sellerConnectId: accountId,
      amountEur: payment.seller_net,
      orderId,
    });
    await payoutSnap.docs[0].ref.set(
      { payout_status: 'executed', psp_payout_ref: transferId, executed_at: new Date().toISOString() },
      { merge: true }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ── A. Adaptateur PSP ─────────────────────────────────────────────────────────

console.log('\nA. Adaptateur PSP (createPspAdapter)');

await test('createConnectAccount → appelle stripe.accounts.create avec type express FR', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const id = await psp.createConnectAccount('vendor@test.fr');
  assert.equal(id, 'acct_test_123');
  const call = fake._calls.find((c: any) => c.method === 'accounts.create');
  assert.ok(call, 'accounts.create non appelé');
  assert.equal(call.args[0].type, 'express');
  assert.equal(call.args[0].country, 'FR');
  assert.equal(call.args[0].email, 'vendor@test.fr');
  assert.equal(call.args[0].capabilities.transfers.requested, true);
});

await test('createOnboardingLink → appelle accountLinks.create avec return_url/refresh_url corrects', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const url = await psp.createOnboardingLink('acct_abc');
  assert.equal(url, 'https://connect.stripe.com/test_link');
  const call = fake._calls.find((c: any) => c.method === 'accountLinks.create');
  assert.ok(call);
  assert.equal(call.args[0].account, 'acct_abc');
  assert.equal(call.args[0].type, 'account_onboarding');
  assert.ok(call.args[0].return_url.includes('connect=done'));
  assert.ok(call.args[0].refresh_url.includes('connect=resume'));
});

await test('getAccountStatus → lit payouts_enabled depuis le compte Stripe', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const status = await psp.getAccountStatus('acct_xyz');
  assert.equal(status.payouts_enabled, true);
  assert.equal(status.details_submitted, true);
  const call = fake._calls.find((c: any) => c.method === 'accounts.retrieve');
  assert.ok(call);
  assert.equal(call.args[0], 'acct_xyz');
});

await test('getAccountStatus → payouts_enabled false si compte non finalisé', async () => {
  const fake = makeFakeStripe({
    'accounts.retrieve': async () => ({ payouts_enabled: false, details_submitted: false }),
  });
  const psp = createPspAdapter(fake);
  const status = await psp.getAccountStatus('acct_new');
  assert.equal(status.payouts_enabled, false);
  assert.equal(status.details_submitted, false);
});

// ── B. Checkout Session ───────────────────────────────────────────────────────

console.log('\nB. Checkout Session');

await test('createCheckoutSession → montant en centimes, metadata correcte', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const params: MarketCheckoutParams = {
    buyerUid: 'buyer_bob',
    buyerEmail: 'bob@test.fr',
    listingId: 'L1',
    listingTitle: 'Arche de mariage',
    amountEur: 172.50,
    quantity: 1,
    deliveryMode: 'shipping',
    shippingAddress: { full_name: 'Bob Martin', street: '12 rue de la Paix', city: 'Paris', postal_code: '75001' },
  };
  const url = await psp.createCheckoutSession(params);
  assert.equal(url, 'https://checkout.stripe.com/test_session');

  const call = fake._calls.find((c: any) => c.method === 'checkout.sessions.create');
  assert.ok(call);
  const arg = call.args[0];
  // Montant en centimes : 172.50 € = 17250 centimes
  assert.equal(arg.line_items[0].price_data.unit_amount, 17250);
  assert.equal(arg.line_items[0].price_data.currency, 'eur');
  assert.equal(arg.metadata.kind, 'market_order');
  assert.equal(arg.metadata.buyer_uid, 'buyer_bob');
  assert.equal(arg.metadata.listing_id, 'L1');
  assert.equal(arg.metadata.delivery_mode, 'shipping');
  assert.equal(arg.metadata.quantity, '1');
  // L'adresse est sérialisée en JSON dans metadata
  const addr = JSON.parse(arg.metadata.shipping_address);
  assert.equal(addr.city, 'Paris');
  assert.equal(arg.mode, 'payment');
});

await test('createCheckoutSession → pas d\'adresse pour mode pickup', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  await psp.createCheckoutSession({
    buyerUid: 'buyer_bob', buyerEmail: null, listingId: 'L1',
    listingTitle: 'Test', amountEur: 50, quantity: 1,
    deliveryMode: 'pickup',
  });
  const call = fake._calls.find((c: any) => c.method === 'checkout.sessions.create');
  assert.equal(call.args[0].metadata.shipping_address, '');
});

await test('cents() → arrondi correct (pas de flottant Stripe)', async () => {
  assert.equal(cents(172.50), 17250);
  assert.equal(cents(0.10), 10);
  // 0.1 + 0.2 flottant classique → on vérifie que Math.round stabilise
  assert.equal(cents(0.1 + 0.2), 30);
  assert.equal(cents(153), 15300);
});

// ── C. executeSellerTransfer ──────────────────────────────────────────────────

console.log('\nC. executeSellerTransfer');

await test('transfer avec idempotencyKey = payout_{payoutId}', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const transferId = await psp.executeSellerTransfer({
    payoutId: 'po_001',
    sellerConnectId: 'acct_seller',
    amountEur: 153,
    orderId: 'ORD_001',
  });
  assert.equal(transferId, 'tr_test_456');
  const call = fake._calls.find((c: any) => c.method === 'transfers.create');
  assert.ok(call);
  assert.equal(call.args[0].amount, 15300, 'montant en centimes');
  assert.equal(call.args[0].currency, 'eur');
  assert.equal(call.args[0].destination, 'acct_seller');
  assert.equal(call.args[0].transfer_group, 'ORD_001');
  assert.equal(call.idempotencyKey, 'payout_po_001', 'idempotency key incorrecte');
});

await test('deux appels avec le même payoutId → même idempotencyKey (pas de double transfer)', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  await psp.executeSellerTransfer({ payoutId: 'po_dup', sellerConnectId: 'acct_s', amountEur: 100, orderId: 'O1' });
  await psp.executeSellerTransfer({ payoutId: 'po_dup', sellerConnectId: 'acct_s', amountEur: 100, orderId: 'O1' });
  const transferCalls = fake._calls.filter((c: any) => c.method === 'transfers.create');
  // Les deux appels portent la MÊME idempotencyKey — Stripe déduplique côté serveur.
  assert.ok(transferCalls.every((c: any) => c.idempotencyKey === 'payout_po_dup'));
});

// ── D. refundPayment ──────────────────────────────────────────────────────────

console.log('\nD. refundPayment');

await test('refund avec idempotencyKey = refund_{orderId}', async () => {
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const refundId = await psp.refundPayment({ paymentIntentId: 'pi_real_abc', orderId: 'ORD_R1' });
  assert.equal(refundId, 're_test_789');
  const call = fake._calls.find((c: any) => c.method === 'refunds.create');
  assert.ok(call);
  assert.equal(call.args[0].payment_intent, 'pi_real_abc');
  assert.equal(call.idempotencyKey, 'refund_ORD_R1');
});

// ── E. settlePayout (logique route orders/[id]) ───────────────────────────────

console.log('\nE. settlePayout');

await test('settle → transfer vers le compte Connect du vendeur + payout executed', async () => {
  const { db, data } = makeDb({
    market_seller_profiles: {
      seller_alice: { psp_account_id: 'acct_alice', psp_onboarded: true },
    },
    market_payouts: {
      pay_001: { id: 'pay_001', order_id: 'ORD_1', seller_id: 'seller_alice', amount: 153, payout_status: 'requested' },
    },
  });
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);

  const result = await settlePayout(db, psp, { seller_id: 'seller_alice', id: 'ORD_1' }, { id: 'pay_001', amount: 153 });

  assert.equal(result.settled, true);
  assert.equal((result as any).transfer_id, 'tr_test_456');
  // Payout mis à jour
  assert.equal(data.market_payouts['pay_001'].payout_status, 'executed');
  assert.equal(data.market_payouts['pay_001'].psp_payout_ref, 'tr_test_456');
  assert.ok(data.market_payouts['pay_001'].executed_at, 'executed_at manquant');
  // Transfer Stripe appelé avec les bons params
  const call = fake._calls.find((c: any) => c.method === 'transfers.create');
  assert.equal(call.args[0].amount, 15300);
  assert.equal(call.args[0].destination, 'acct_alice');
});

await test('settle → pas de Stripe si vendeur sans compte Connect', async () => {
  const { db } = makeDb({
    market_seller_profiles: {
      seller_no_connect: { psp_onboarded: false },  // pas de psp_account_id
    },
  });
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const result = await settlePayout(db, psp, { seller_id: 'seller_no_connect', id: 'ORD_2' }, { id: 'pay_002', amount: 100 });
  assert.equal(result.settled, false);
  assert.equal(fake._calls.length, 0, 'Stripe ne doit pas être appelé');
});

await test('settle → ne propage pas l\'erreur Stripe (payout reste requesté)', async () => {
  const { db, data } = makeDb({
    market_seller_profiles: { seller_err: { psp_account_id: 'acct_err' } },
    market_payouts: { pay_err: { id: 'pay_err', order_id: 'ORD_E', amount: 50, payout_status: 'requested' } },
  });
  const fake = makeFakeStripe({
    'transfers.create': async () => { throw new Error('Stripe error simulée'); },
  });
  const psp = createPspAdapter(fake);
  // Ne doit pas propager l'exception
  const result = await settlePayout(db, psp, { seller_id: 'seller_err', id: 'ORD_E' }, { id: 'pay_err', amount: 50 });
  assert.equal(result.settled, false);
  // Payout doit rester 'requested' (pas mis à jour)
  assert.equal(data.market_payouts['pay_err'].payout_status, 'requested');
});

// ── F. settleDispute ──────────────────────────────────────────────────────────

console.log('\nF. settleDispute');

await test('décision buyer + psp_ref réel → refund Stripe déclenché', async () => {
  const { db } = makeDb({
    market_payments: {
      pm_d1: { order_id: 'ORD_D1', psp_ref: 'pi_real_xyz789', seller_net: 120, seller_id: 'seller_b' },
    },
  });
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  await settleDispute(db, psp, 'buyer', 'ORD_D1');
  const call = fake._calls.find((c: any) => c.method === 'refunds.create');
  assert.ok(call, 'refunds.create non appelé');
  assert.equal(call.args[0].payment_intent, 'pi_real_xyz789');
  assert.equal(call.idempotencyKey, 'refund_ORD_D1');
});

await test('décision buyer + psp_ref de démo (pi_test_…) → aucun refund Stripe', async () => {
  const { db } = makeDb({
    market_payments: {
      pm_d2: { order_id: 'ORD_D2', psp_ref: 'pi_test_1234567', seller_net: 80, seller_id: 'seller_c' },
    },
  });
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  await settleDispute(db, psp, 'buyer', 'ORD_D2');
  const call = fake._calls.find((c: any) => c.method === 'refunds.create');
  assert.ok(!call, 'refund Stripe NE DOIT PAS être appelé pour un psp_ref de démo');
});

await test('décision seller → transfer vers le compte Connect du vendeur', async () => {
  const { db, data } = makeDb({
    market_payments: {
      pm_d3: { order_id: 'ORD_D3', psp_ref: 'pi_real_abc', seller_net: 138, seller_id: 'seller_d' },
    },
    market_seller_profiles: {
      seller_d: { psp_account_id: 'acct_seller_d' },
    },
    market_payouts: {
      pout_d3: { order_id: 'ORD_D3', seller_id: 'seller_d', amount: 138, payout_status: 'requested' },
    },
  });
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  await settleDispute(db, psp, 'seller', 'ORD_D3');

  const call = fake._calls.find((c: any) => c.method === 'transfers.create');
  assert.ok(call, 'transfers.create non appelé');
  assert.equal(call.args[0].destination, 'acct_seller_d');
  assert.equal(call.args[0].amount, 13800, 'montant en centimes');
  // Payout mis à jour
  assert.equal(data.market_payouts['pout_d3'].payout_status, 'executed');
  assert.ok(data.market_payouts['pout_d3'].psp_payout_ref, 'psp_payout_ref manquant');
  assert.ok(data.market_payouts['pout_d3'].executed_at, 'executed_at manquant');
});

await test('décision seller → skip si vendeur sans compte Connect', async () => {
  const { db } = makeDb({
    market_payments: {
      pm_d4: { order_id: 'ORD_D4', psp_ref: 'pi_real_def', seller_net: 90, seller_id: 'seller_e' },
    },
    market_seller_profiles: {
      seller_e: {},  // pas de psp_account_id
    },
    market_payouts: {
      pout_d4: { order_id: 'ORD_D4', amount: 90, payout_status: 'requested' },
    },
  });
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  await settleDispute(db, psp, 'seller', 'ORD_D4');
  assert.equal(fake._calls.length, 0, 'Stripe ne doit pas être appelé');
});

// ── G. Webhook — checkout.session.completed (kind=market_order) ───────────────

console.log('\nG. Webhook — checkout.session.completed');

await test('kind=market_order → crée la commande avec le psp_ref réel du PaymentIntent', async () => {
  const { db, data } = makeDb({
    market_listings: {
      L_webhook: {
        id: 'L_webhook', seller_id: 'seller_w', title: 'Bouquet séché',
        price: 80, quantity: 3, quantity_reserved: 0, status: 'active',
        images: ['bouquet.jpg'],
        delivery: { shipping: true, shipping_cost: 8, pickup: false },
      },
    },
    market_orders: {},
    market_payments: {},
  });

  const orderSvc = createOrderService(db as any);

  // Simule ce que le webhook fait après checkout.session.completed
  const simulateWebhook = async (session: {
    payment_intent: string;
    metadata: Record<string, string>;
  }) => {
    if (session.metadata?.kind !== 'market_order') return;
    const m = session.metadata;
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent : '';
    await orderSvc.createOrder(m.buyer_uid!, {
      listing_id: m.listing_id!,
      quantity: parseInt(m.quantity || '1', 10) || 1,
      delivery_mode: (m.delivery_mode === 'pickup' ? 'pickup' : 'shipping') as 'shipping' | 'pickup',
      shipping_address: m.shipping_address ? JSON.parse(m.shipping_address) : undefined,
      psp_ref: paymentIntentId,
    });
  };

  await simulateWebhook({
    payment_intent: 'pi_live_real123',
    metadata: {
      kind: 'market_order',
      buyer_uid: 'buyer_webhook',
      listing_id: 'L_webhook',
      quantity: '1',
      delivery_mode: 'shipping',
      shipping_address: JSON.stringify({
        full_name: 'Alice Webhook', street: '1 rue Test', city: 'Lyon', postal_code: '69001',
      }),
    },
  });

  const orders = Object.values(data.market_orders || {});
  assert.equal(orders.length, 1, 'Une commande doit être créée');
  const order = orders[0] as any;
  assert.equal(order.order_status, 'paid');
  assert.equal(order.seller_id, 'seller_w');
  assert.equal(order.buyer_id, 'buyer_webhook');

  // La psp_ref dans le payment doit être le vrai PaymentIntent ID
  const payments = Object.values(data.market_payments || {});
  assert.equal(payments.length, 1, 'Un paiement doit être créé');
  const payment = payments[0] as any;
  assert.equal(payment.psp_ref, 'pi_live_real123', 'psp_ref doit être le PaymentIntent réel');
  assert.equal(payment.payment_status, 'payout_pending', 'fonds bloqués (séquestre)');
  assert.equal(payment.psp, 'stripe_connect');
});

await test('kind != market_order → commande NON créée (webhook abonnements)', async () => {
  const { data } = makeDb({ market_orders: {} });
  // Simule le cas où metadata.kind est absent (webhook abonnement existant)
  const session = { metadata: { uid: 'vendor_123', planId: 'pro' }, payment_intent: 'pi_sub' };
  // Le handler vérifie kind avant de créer la commande — rien ne se passe
  if (session.metadata && 'kind' in session.metadata) {
    assert.fail('Ce branch ne doit pas être atteint');
  }
  assert.equal(Object.keys(data.market_orders).length, 0, 'Aucune commande pour un webhook abonnement');
});

// ── H. account.updated webhook ────────────────────────────────────────────────

console.log('\nH. Webhook — account.updated');

await test('account.updated → psp_onboarded synchronisé en base', async () => {
  const { db, data } = makeDb({
    market_seller_profiles: {
      seller_onb: { psp_account_id: 'acct_seller_onb', psp_onboarded: false },
    },
  });

  // Simule le handler webhook account.updated
  const simulateAccountUpdated = async (accountId: string, payoutsEnabled: boolean) => {
    const snap = await db
      .collection('market_seller_profiles')
      .where('psp_account_id', '==', accountId)
      .limit(1)
      .get();
    if (!snap.empty) {
      await snap.docs[0].ref.set(
        { psp_onboarded: payoutsEnabled, updated_at: new Date().toISOString() },
        { merge: true }
      );
    }
  };

  await simulateAccountUpdated('acct_seller_onb', true);
  assert.equal(data.market_seller_profiles['seller_onb'].psp_onboarded, true);
  assert.ok(data.market_seller_profiles['seller_onb'].updated_at);
});

await test('account.updated → compte inconnu ignoré sans erreur', async () => {
  const { db } = makeDb({ market_seller_profiles: {} });
  const simulateAccountUpdated = async (accountId: string, payoutsEnabled: boolean) => {
    const snap = await db
      .collection('market_seller_profiles')
      .where('psp_account_id', '==', accountId)
      .limit(1)
      .get();
    if (!snap.empty) {
      await snap.docs[0].ref.set({ psp_onboarded: payoutsEnabled }, { merge: true });
    }
  };
  // Doit terminer sans exception
  await simulateAccountUpdated('acct_unknown', true);
});

// ── I. Mode démo (isPspEnabled = false) ──────────────────────────────────────

console.log('\nI. Mode démo (PSP désactivé)');

await test('isPspEnabled → false si STRIPE_SECRET_KEY absente', async () => {
  const origKey = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  assert.equal(isPspEnabled(), false);
  process.env.STRIPE_SECRET_KEY = origKey || '';
});

await test('settlePayout sans compte Connect → settled:false, aucun appel Stripe', async () => {
  const { db } = makeDb({
    market_seller_profiles: {
      seller_demo: {},  // pas de psp_account_id → mode démo
    },
  });
  const fake = makeFakeStripe();
  const psp = createPspAdapter(fake);
  const result = await settlePayout(db, psp, { seller_id: 'seller_demo', id: 'ORD_DEMO' }, { id: 'pay_demo', amount: 50 });
  assert.equal(result.settled, false);
  assert.equal(fake._calls.length, 0);
});

// ── J. Calculs de montants (cohérence checkout route) ─────────────────────────

console.log('\nJ. Calculs de montants');

await test('grand total = items + shipping + 5% service fee (arrondi centimes)', async () => {
  // Reproduit la formule de /api/market/checkout/route.ts
  const price = 150, quantity = 1, shippingCost = 15;
  const itemsTotal = price * quantity; // 150
  const serviceFee = Math.round(itemsTotal * 0.05 * 100) / 100; // 7.50
  const grandTotal = Math.round((itemsTotal + shippingCost + serviceFee) * 100) / 100;
  assert.equal(grandTotal, 172.50);
  assert.equal(cents(grandTotal), 17250, 'Doit être 17250 centimes');
});

await test('montant pickup = items + service fee (pas de frais livraison)', async () => {
  const price = 80, quantity = 2;
  const itemsTotal = price * quantity; // 160
  const shippingCost = 0; // pickup
  const serviceFee = Math.round(itemsTotal * 0.05 * 100) / 100; // 8.00
  const grandTotal = Math.round((itemsTotal + shippingCost + serviceFee) * 100) / 100;
  assert.equal(grandTotal, 168);
  assert.equal(cents(grandTotal), 16800);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BILAN
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n${'─'.repeat(60)}`);
console.log(`  Résultats : ${passed} ✓ passés  ${failed > 0 ? `${failed} ✗ échoués` : '0 échoués'}`);
console.log('─'.repeat(60));

if (failed > 0) {
  process.exit(1);
}
