# Système de Gestion Multi-Abonnements (Stripe + PayPal)

## Vue d'ensemble

Ce système garantit qu'un utilisateur ne peut avoir qu'**un seul abonnement actif à la fois**, quelle que soit la méthode de paiement (Stripe ou PayPal).

## Règles Métier Principales

| Règle | Description |
|-------|-------------|
| **Un seul actif** | Maximum 1 abonnement actif par utilisateur |
| **Switch auto** | Changement de provider = annulation automatique de l'ancien |
| **DB = Source** | Firestore est la source de vérité, synchronisée via webhooks |
| **Pas de double** | Double paiement techniquement impossible |

## Architecture

### Collections Firestore

```
vendors/{uid}
├── subscriptionTier: "starter" | "pro" | "enterprise" | "free"
├── subscriptionStatus: "active" | "canceled" | "past_due"
├── subscriptionProvider: "stripe" | "paypal" | null
├── stripeCustomerId: string | null
├── stripeSubscriptionId: string | null
├── paypalSubscriptionId: string | null
└── updatedAt: timestamp

subscriptions/{subscriptionId}
├── userId: string
├── provider: "stripe" | "paypal"
├── providerSubscriptionId: string
├── status: "active" | "canceled" | "past_due" | "expired"
├── tier: string
├── startDate: timestamp
├── endDate: timestamp | null
├── createdAt: timestamp
└── updatedAt: timestamp
```

### Flow : Switch Stripe → PayPal

```
1. User clique "S'abonner avec PayPal"
2. API /api/paypal/checkout
   └─ Détecte abonnement Stripe actif
   └─ Annule Stripe via API
   └─ Marque Stripe comme 'canceled' dans subscriptions
   └─ Crée nouvel abonnement PayPal
3. Webhook PayPal ACTIVATED
   └─ Crée entrée subscriptions (PayPal)
   └─ Nettoie tous les Stripe actifs
   └─ Met à jour vendor (provider=paypal)
```

### Flow : Switch PayPal → Stripe

```
1. User clique "S'abonner avec Stripe"
2. API /api/stripe/checkout
   └─ Détecte abonnement PayPal actif
   └─ Marque PayPal comme 'canceled' dans subscriptions
   └─ Crée checkout Stripe
3. Webhook Stripe checkout.session.completed
   └─ Crée entrée subscriptions (Stripe)
   └─ Nettoie tous les PayPal actifs
   └─ Met à jour vendor (provider=stripe)
```

## Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `src/lib/subscription-manager.ts` | Logique métier (cancel, sync, cleanup) |
| `src/app/api/stripe/checkout/route.ts` | Checkout Stripe avec anti-double |
| `src/app/api/paypal/checkout/route.ts` | Checkout PayPal avec anti-double |
| `src/app/api/stripe/webhook/route.ts` | Webhook Stripe + sync subscriptions |
| `src/app/api/paypal/webhook/route.ts` | Webhook PayPal + sync subscriptions |
| `src/app/api/subscriptions/route.ts` | API pour récupérer abonnements user |

## API Endpoints

### Récupérer mes abonnements
```
GET /api/subscriptions
Authorization: Bearer {token}

Response:
{
  "ok": true,
  "active": {
    "id": "sub_xxx",
    "provider": "stripe",
    "status": "active",
    "tier": "pro"
  },
  "history": [...],
  "hasMultipleProviders": false
}
```

## Fonctions Clés

### `resolveSubscriptionConflict()`
Annule l'abonnement existant avant d'en créer un nouveau.

```typescript
import { resolveSubscriptionConflict } from '@/lib/subscription-manager';

const result = await resolveSubscriptionConflict(userId, 'stripe', true);
// result.action = 'canceled' | 'scheduled_cancel' | 'none'
// result.previousSubscription = l'ancien abonnement annulé
```

### `getActiveSubscription()`
Récupère l'abonnement actif d'un utilisateur.

```typescript
const active = await getActiveSubscription(userId);
if (active?.provider === 'paypal') {
  // Annuler avant de créer Stripe
}
```

### `cleanupActiveSubscriptions()`
Marque tous les autres abonnements comme canceled (sécurité).

```typescript
await cleanupActiveSubscriptions(userId, newSubscriptionId);
```

## Webhooks Gérés

### Stripe
- `checkout.session.completed` → Création subscription
- `customer.subscription.updated` → Mise à jour status
- `customer.subscription.deleted` → Marquer canceled
- `invoice.payment_failed` → Marquer past_due

### PayPal
- `BILLING.SUBSCRIPTION.ACTIVATED` → Création subscription
- `BILLING.SUBSCRIPTION.UPDATED` → Mise à jour status
- `BILLING.SUBSCRIPTION.CANCELLED` → Marquer canceled
- `BILLING.SUBSCRIPTION.EXPIRED` → Marquer expired
- `BILLING.SUBSCRIPTION.PAYMENT.FAILED` → Marquer past_due

## Edge Cases Gérés

| Cas | Comportement |
|-----|--------------|
| Double clic sur paiement | Un seul abonnement créé (idempotence) |
| Webhook reçu 2x | Pas de doublon (upsert par providerSubscriptionId) |
| User annule sur provider | Webhook met à jour DB automatiquement |
| Paiement échoué | Status → past_due, retry automatique |
| Changement rapide provider | Ancien annulé immédiatement, nouveau créé |

## Sécurité

- Vérification signature webhooks (Stripe + PayPal)
- Authentification Firebase sur toutes les routes API
- Nettoyage automatique des anciens abonnements
- Historique conservé (pas de suppression)

## Migration

Pour migrer les anciens abonnements existants vers la nouvelle collection `subscriptions`:

```typescript
// Script de migration (à exécuter une fois)
const vendors = await adminDb.collection('vendors').get();
for (const doc of vendors.docs) {
  const vendor = doc.data();
  if (vendor.stripeSubscriptionId) {
    await createSubscription({
      userId: doc.id,
      provider: 'stripe',
      providerSubscriptionId: vendor.stripeSubscriptionId,
      status: vendor.subscriptionStatus || 'active',
      tier: vendor.subscriptionTier,
      startDate: vendor.subscriptionCurrentPeriodStart || new Date(),
    });
  }
  // Même chose pour PayPal...
}
```

## Monitoring

Vérifier les logs pour :
- `[stripe/checkout] Conflit résolu`
- `[paypal/checkout] Conflit résolu`
- `[SubscriptionManager] Nettoyé X anciens abonnements`
- Webhooks reçus et traités

## Tests Recommandés

1. **Stripe → PayPal** : S'abonner Stripe, puis s'abonner PayPal → Stripe doit être canceled
2. **PayPal → Stripe** : S'abonner PayPal, puis s'abonner Stripe → PayPal doit être canceled
3. **Annulation provider** : Annuler sur Stripe/PayPal → DB doit refléter le changement
4. **Double paiement** : Double clic rapide → Un seul abonnement actif
