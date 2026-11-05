/**
 * Test du webhook Stripe local.
 * Envoie des events signés avec STRIPE_WEBHOOK_SECRET à /api/stripe/webhook.
 *
 * Usage : node test-webhook.mjs [port]
 *   PORT par défaut : 3001
 */
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lecture manuelle de .env.local (dotenv n'est pas dans les deps)
// Gère les fins de ligne CRLF (\r\n) typiques Windows
const envPath = path.join(__dirname, '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  const eq = trimmed.indexOf('=');
  if (eq > 0 && /^[A-Z0-9_]+$/.test(trimmed.slice(0, eq))) {
    const key = trimmed.slice(0, eq);
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
  }
}

const PORT = process.argv[2] || '3001';
const WEBHOOK_URL = `http://localhost:${PORT}/api/stripe/webhook`;
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET absente de .env.local');
  process.exit(1);
}
console.log(`Webhook secret : ${SECRET.slice(0, 10)}...`);
console.log(`Cible : ${WEBHOOK_URL}\n`);

// Client Stripe dummy — on n'utilise que la génération de signature de test
const stripe = new Stripe('sk_test_placeholder');

async function sendEvent(name, eventPayload, expectStatus = 200) {
  const payload = JSON.stringify(eventPayload);
  const sig = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: SECRET,
  });
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': sig,
    },
    body: payload,
  });
  const body = await res.text();
  const ok = res.status === expectStatus;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  console.log(`   status: ${res.status} (attendu ${expectStatus})  body: ${body.slice(0, 200)}`);
  return ok;
}

let passed = 0, failed = 0;
const check = (b) => (b ? passed++ : failed++);

// ── 1. account.updated (le nouvel event) ────────────────────────────────────
check(
  await sendEvent('account.updated (compte inconnu → no-op, doit répondre 200)', {
    id: 'evt_test_acct_1',
    object: 'event',
    type: 'account.updated',
    api_version: '2026-02-25.clover',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: 'acct_fake_12345',
        object: 'account',
        payouts_enabled: true,
        details_submitted: true,
      },
    },
  })
);

// ── 2. checkout.session.completed — non-market (abonnement, pas de uid → 200) ─
check(
  await sendEvent('checkout.session.completed (sans uid → 200 no-op)', {
    id: 'evt_test_cs_1',
    object: 'event',
    type: 'checkout.session.completed',
    api_version: '2026-02-25.clover',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: 'cs_test_fake_1',
        object: 'checkout.session',
        mode: 'subscription',
        payment_intent: 'pi_fake_1',
        customer: 'cus_fake_1',
        subscription: 'sub_fake_1',
        metadata: {},
      },
    },
  })
);

// ── 3. checkout.session.completed — market_order avec annonce inexistante ────
// Doit répondre 500 (le service jette "Annonce introuvable") → prouve que la
// signature + parsing + branchement market fonctionnent.
check(
  await sendEvent('checkout.session.completed kind=market_order (annonce inexistante → 500 attendu)', {
    id: 'evt_test_cs_2',
    object: 'event',
    type: 'checkout.session.completed',
    api_version: '2026-02-25.clover',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: 'cs_test_fake_2',
        object: 'checkout.session',
        mode: 'payment',
        payment_intent: 'pi_fake_market_1',
        metadata: {
          kind: 'market_order',
          buyer_uid: 'buyer_fake',
          listing_id: 'LISTING_INEXISTANT_999',
          quantity: '1',
          delivery_mode: 'pickup',
          shipping_address: '',
        },
      },
    },
  },
  500)
);

// ── 4. Signature invalide → 400 ─────────────────────────────────────────────
{
  const payload = JSON.stringify({ id: 'evt_bad', type: 'account.updated', data: { object: { id: 'x' } } });
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 't=1,v1=fakesignature',
    },
    body: payload,
  });
  const ok = res.status === 400;
  console.log(`${ok ? '✓' : '✗'} signature invalide rejetée`);
  console.log(`   status: ${res.status} (attendu 400)`);
  check(ok);
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`${passed} ✓ passés  ${failed} ✗ échoués`);
console.log('─'.repeat(50));
process.exit(failed > 0 ? 1 : 0);
