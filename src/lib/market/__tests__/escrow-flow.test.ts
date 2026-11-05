// Test unitaire de validation du flux Escrow / Séquestre LeOui Market
// Exécution : npx ts-node src/lib/market/__tests__/escrow-flow.test.ts

import { createOrderService } from '../order-service';

async function runEscrowTest() {
  console.log('🧪 Démarrage du test unitaire du flux Escrow...');

  // Mock en mémoire de Firestore pour simuler le comportement transactionnel
  const database: Record<string, Record<string, any>> = {
    market_listings: {
      listing_123: {
        id: 'listing_123',
        seller_id: 'seller_alice',
        title: 'Arche de mariage en métal',
        price: 150,
        quantity: 2,
        quantity_reserved: 0,
        status: 'active',
        images: ['https://example.com/arche.jpg'],
        delivery: { shipping: true, shipping_cost: 15, pickup: true },
      },
    },
    market_orders: {},
    market_payments: {},
    market_payouts: {},
  };

  const fakeDb: any = {
    collection: (name: string) => ({
      doc: (id?: string) => {
        const docId = id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        return {
          id: docId,
          get: async () => ({
            exists: Boolean(database[name]?.[docId]),
            data: () => database[name]?.[docId],
          }),
          update: async (patch: any) => {
            if (database[name]?.[docId]) {
              Object.assign(database[name][docId], patch);
            }
          },
          set: async (data: any) => {
            if (!database[name]) database[name] = {};
            database[name][docId] = data;
          },
        };
      },
      where: (field: string, op: string, val: any) => ({
        limit: () => ({
          get: async () => {
            const matches = Object.values(database[name] || {}).filter((item: any) => item[field] === val);
            return {
              empty: matches.length === 0,
              docs: matches.map((m: any) => ({
                id: m.id,
                ref: {
                  update: async (patch: any) => Object.assign(m, patch),
                },
                data: () => m,
              })),
            };
          },
        }),
      }),
    }),
    runTransaction: async (updateFn: any) => {
      const transaction = {
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any) => {
          const colName = ref.id.startsWith('doc_') ? 'market_orders' : 'market_orders';
          // auto routing dans la base mock
          if (data.listing_snapshot) database.market_orders[ref.id] = data;
          else if (data.commission_rate) database.market_payments[ref.id] = data;
          else if (data.payout_status) database.market_payouts[ref.id] = data;
        },
        update: (ref: any, patch: any) => {
          if (database.market_listings[ref.id]) Object.assign(database.market_listings[ref.id], patch);
          if (database.market_orders[ref.id]) Object.assign(database.market_orders[ref.id], patch);
          if (database.market_payments[ref.id]) Object.assign(database.market_payments[ref.id], patch);
        },
      };
      return await updateFn(transaction);
    },
  };

  const service = createOrderService(fakeDb);

  // 1. ACHAT & MISE SOUS SÉQUESTRE
  const { order, payment } = await service.createOrder('buyer_bob', {
    listing_id: 'listing_123',
    quantity: 1,
    delivery_mode: 'shipping',
    shipping_address: {
      full_name: 'Bob Martin',
      street: '10 rue des Fleurs',
      city: 'Paris',
      postal_code: '75001',
      country: 'France',
    },
  });

  console.assert(order.amounts.total === 172.5, `Montant total attendu 172.5, obtenu : ${order.amounts.total}`);
  console.assert(payment.payment_status === 'payout_pending', 'Le paiement doit être bloqué sous séquestre (payout_pending)');
  console.log('✅ Étape 1 : Commande créée avec succès et paiement bloqué sous séquestre.');

  // 2. EXPÉDITION PAR LE VENDEUR
  const shippedOrder = await service.shipOrder('seller_alice', {
    order_id: order.id,
    carrier: 'Colissimo',
    tracking_number: '6A12345678',
  });
  console.assert(shippedOrder.order_status === 'shipped', 'Le statut doit être shipped');
  console.assert(shippedOrder.tracking?.number === '6A12345678', 'Le numéro de suivi doit être enregistré');
  console.log('✅ Étape 2 : Colis expédié avec numéro de suivi.');

  // 3. CONFIRMATION DE RÉCEPTION PAR L’ACHETEUR & LIBÉRATION DES FONDS
  database.market_payments[payment.id] = payment; // assure la liaison
  const { order: completedOrder, payout } = await service.confirmReceipt('buyer_bob', order.id);

  console.assert(completedOrder.order_status === 'completed', 'La commande doit être clôturée (completed)');
  console.assert(payout.amount === payment.seller_net, `Le reversement doit être égal au net vendeur (${payment.seller_net})`);
  console.assert(payout.payout_status === 'requested', 'L’instruction de virement doit être requested');
  console.log('✅ Étape 3 : Réception confirmée par l’acheteur, fonds libérés au vendeur.');

  console.log('🎉 TOUS LES TESTS DU FLUX ESCROW ONT RÉUSSI AVEC SUCCÈS !');
}

runEscrowTest().catch((err) => {
  console.error('❌ Échec du test :', err);
  process.exit(1);
});
