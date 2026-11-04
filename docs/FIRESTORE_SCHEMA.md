# Schémas Firestore partagés — Sprint Novembre 2026

> **À valider par Junel & Adnane avant tout dev.** Document de référence pour les
> collections des 8 fonctionnalités du sprint. Objectif : éviter les collisions de
> merge du vendredi et garantir un nommage cohérent.

## Conventions communes

- **Snake_case** pour tous les champs (`created_at`, `event_id`…)
- **Dates** : chaînes ISO 8601 (`new Date().toISOString()`)
- **Horodatage systématique** : `created_at`, `updated_at` sur toute entité mutable
- **Lien au mariage** : `event_id` (doc `events`) — fallback `client_id` si pas d'event
- **Accès invité sans compte** (album photo, livre d'or) : `public_token` opaque sur
  le doc parent → **passage obligatoire par une API route** (`adminDb`), jamais par
  les helpers client `db.ts`. Le token n'est jamais prévisible (`crypto.randomUUID()`).
- **Statuts** : unions de strings explicites, jamais de booléens ambigus.
- **Accès serveur** : `adminDb` (firebase-admin) dans les API routes ; accès client
  `db.ts` uniquement pour les données de l'utilisateur connecté.

## Collections existantes (rappel)

| Collection | Rôle |
|---|---|
| `users` | uid, email, role (`client`/`planner`/`vendor`/`admin`), created_at |
| `profiles` | uid, name, partner, phone, address, role |
| `clients` | données couple/client |
| `events` | mariage (client_id, event_date, couple_names, venue…) |
| `guests` | invités (event_id, first_name, last_name, rsvp, side, table, menu, menu_other, plus_one, has_children, children_count, notes) |
| `vendors` | prestataires |
| `promotions`, `cities` | promos et villes actives |

---

## 1. LeOui Market (Junel) — `market_*`

Le CDC impose **3 objets métier distincts** : commande, paiement, reversement.
Les statuts sont séparés (§14 du CDC). Ne jamais fusionner dans un seul champ.

### `market_seller_profiles/{uid}`
Profil vendeur — requis avant la 1re annonce (RM-004). Indépendant du profil mariage.
```
uid, display_name (public), status: 'particulier' | 'professionnel',
phone, address { street, city, postal_code, country },
psp_account_id (ex: stripe_connect_id / mangopay_user_id), psp_onboarded: bool,
verified: { email, phone, identity, payout }, rating_avg, rating_count,
created_at, updated_at
```

### `market_listings/{id}`
```
seller_id, title, slug, description,
category, subcategory,
price: number, quantity, quantity_reserved (réservation panier/paiement, RM-010),
condition: 'neuf' | 'comme_neuf' | 'bon_etat' | 'usage',
images: string[], attributes { dimensions, material, color, defects },
location: { city, postal_code, approx_lat, approx_lng }, // approximative, jamais l'adresse exacte
delivery: { shipping: bool, shipping_cost, pickup: bool },
status: 'draft' | 'pending_review' | 'active' | 'paused' | 'reserved'
      | 'sold' | 'exhausted' | 'suspended' | 'removed',
views_count, favorites_count,
moderation_note, published_at, created_at, updated_at
```

### `market_orders/{id}`
```
listing_id, listing_snapshot { title, image, price }, // fige l'annonce à l'achat
buyer_id, seller_id, quantity,
delivery_mode: 'shipping' | 'pickup',
shipping_address {...} (si shipping),
pickup_code (code de remise à usage unique, si pickup),
amounts { items, shipping, service_fee, total },
order_status: 'pending_payment' | 'paid' | 'preparing'
  | 'shipped' | 'pickup_scheduled' | 'delivered'
  | 'receipt_confirmed' | 'completed'
  | 'cancelled' | 'payment_failed' | 'disputed' | 'refunding' | 'refunded',
tracking { carrier, number, shipped_at, delivered_at },
receipt_confirmed_at, history: [{ status, at, by }],
created_at, updated_at
```

### `market_payments/{id}`
```
order_id, buyer_id, seller_id,
amount, currency: 'eur',
commission_rate (figée à la commande, RM-019), commission_amount, seller_net,
psp: 'stripe_connect' | 'mangopay', psp_ref (payment_intent / transfer id),
idempotency_key (RM-020, dédup webhook),
payment_status: 'initiated' | 'pending' | 'confirmed' | 'payout_pending'
  | 'payout_requested' | 'paid_out' | 'refunding' | 'refunded' | 'failed',
events: [{ type, at, payload_hash }],
created_at, updated_at
```

### `market_payouts/{id}`
```
payment_id, order_id, seller_id, amount, currency,
payout_status: 'pending' | 'requested' | 'executed' | 'failed',
psp_payout_ref, requested_at, executed_at, created_at, updated_at
```

### `market_disputes/{id}`
```
order_id, opened_by, reason:
  'not_received' | 'damaged' | 'not_as_described'
  | 'wrong_quantity' | 'wrong_item' | 'pickup_issue' | 'other',
description, evidence: string[],
status: 'open' | 'awaiting_seller' | 'under_review'
  | 'resolved_buyer' | 'resolved_seller' | 'closed',
seller_response, resolution_note, decided_by, decided_at,
created_at, updated_at
```

### `market_reviews/{id}`
```
order_id (RM-018 : avis uniquement sur transaction réelle — unique),
reviewer_id, seller_id, listing_id,
rating: 1-5, comment, seller_reply, status: 'visible' | 'flagged' | 'removed',
created_at
```

### `market_favorites/{buyerId_listingId}`
```
buyer_id, listing_id, created_at
```

### `market_categories/{id}` — gérées en admin (§2.2 CDC)
```
label, slug, parent_slug (null = catégorie racine), order, active
```
Seed : decoration, art_table, mobilier, papeterie, accessoires,
tenues_accessoires, eclairage_animation, materiel_evenementiel.

### `market_settings/global`
```
commission_rate: 0.08, service_fee_rules, receipt_auto_confirm_days,
dispute_response_days, updated_by, updated_at
```

### `market_audit_log/{id}` — journalisation des opérations sensibles (RM-020)
```
actor_id, actor_role, action, entity_type, entity_id,
before_hash / details, at
```

### Messagerie (implémentée)
Écritures : uniquement via `/api/market/*` (Admin SDK). Lecture temps réel côté client
réservée aux participants par règles Firestore.

`market_conversations/{id}` — id déterministe : `{buyer}_{seller}_{listing}` ou
`{uidA}_{uidB}_profile` (paire triée, sans annonce)
```
buyer_id, seller_id, participant_ids[2], participants { uid: { display_name, photo_url } },
listing_id | null, listing_snapshot { title, image, price, slug } | null,
last_message { message_id, sender_id, preview, at } | null, last_message_at,
unread { uid: n }, last_read_at { uid: iso }   // accusés « vu »
notified_at { uid: iso }                       // anti-spam email (15 min)
blocked_by: uid | null, created_at, updated_at
```
`market_conversations/{id}/messages/{messageId}` — messageId = `client_id` (idempotence)
```
conversation_id, sender_id, body (≤ 2000), attachments [{ url }] (≤ 3, Cloudinary du compte),
created_at, edited_at | null, deleted_at | null   // supprimé = body '' + attachments []
```
Modification / suppression : auteur uniquement, 10 min après `created_at` (vérifié serveur).

`market_presence/{uid}` : `{ user_id, last_seen_at }` — « en ligne » si < 90 s
`market_blocks/{blocker}_{blocked}` : `{ blocker_id, blocked_id, created_at }`
`market_rate_limits/{uid}_{bucket}` : `{ window_start, count }` (30 msg/min, 10 nouvelles conv./h)

### Signalements
`market_reports/{id}` : `type: 'listing' | 'conversation'`, reporter_id, reason, status,
comment ; pour `conversation` : conversation_id, reported_user_id, `evidence[]` (copie des
30 derniers messages, conservée même si l'auteur supprime ensuite).

---

## 2. Plan de table (Junel) — `seating_plans/{event_id}`

Un doc par mariage (1 canevas, ≤50 tables / ~300 chaises → tient dans 1 Mo).

```
event_id,
tables: [{
  id, label, shape: 'round' | 'oval' | 'rect' | 'head',
  x, y, rotation, seats, color
}],
room_items: [{ id, type: 'dancefloor'|'bar'|'buffet'|'stage'|'dj'|'entrance'|'photobooth',
               x, y, w, h, rotation, label }],
assignments: { [seatKey: `${tableId}_${seatIndex}`]: guest_id }, // anti-collision RM
background_image_url,
updated_at
```
Invités lus depuis `guests` (event_id, rsvp='confirmed'). Pas de duplication des invités.

## 3. Planning du jour J (Junel) — `day_plans/{event_id}`

```
event_id,
days: {
  eve:   { date, items: TimelineItem[] },
  day:   { date, items: TimelineItem[] },
  after: { date, items: TimelineItem[] },
}
// TimelineItem:
// { id, title, start_time (ISO ou 'HH:mm'), end_time|null, duration_min,
//   category, location { name, address, travel_min }, people: string[],
//   notes, vendor_ids: string[], sort_key }
share: { token, vendor_links: [{ vendor_id, token }] },
vendor_requests: [{ id, vendor_id, item_id, proposed_start, reason,
                    status: 'pending'|'accepted'|'declined', at }],
updated_at
```

## 4. Album photo QR (Junel) — `photo_albums/{id}` + `photo_album_items/{id}`

`photo_albums/{id}` :
```
event_id, owner_id, title, public_token, // accès invité sans compte
photographer_album_url (album officiel à côté),
settings { max_photo_mb, moderation: bool },
created_at, updated_at
```
`photo_album_items/{id}` :
```
album_id, storage_path, thumb_path,
guest_name, comment, moment_id (nullable → créneau du day_plan),
favorite: bool, hidden: bool, // modération
uploaded_at
```

## 5. Livre d'or audio (Adnane) — `guestbooks/{id}` + `guestbook_entries/{id}`

`guestbooks/{id}` :
```
event_id, owner_id, title, public_token,
settings { max_duration_sec, window_open_at, window_close_at },
created_at, updated_at
```
`guestbook_entries/{id}` :
```
guestbook_id, type: 'audio' | 'text',
audio_path, duration_sec, waveform: number[] (si audio),
body (si text), guest_name,
favorite: bool, hidden: bool,
created_at
```

## 6. Gazette (Adnane) — `gazettes/{event_id}`

```
event_id, title, cover_image_url,
sections: [{ id, type: 'story'|'anecdote'|'quiz'|'program'|'custom',
             title, content, order }],
program_synced_from_plan: bool, program_overridden: bool,
layout: { theme, accent_color },
updated_at
```

## 7. Menu (Adnane) — `menus/{event_id}`

```
event_id,
courses: [{ id, key: 'vin_honneur'|'entree'|'plat'|'fromage'|'dessert'|'cafe',
            dishes: [{ id, name, note, status: 'envisage'|'retenu' }] }],
dietary_notes, decision_log: [{ at, by, change }],
updated_at
```
Compteurs régimes calculés à la volée depuis `guests.menu` / `menu_other`
(pas de duplication — source de vérité = `guests`).

## 8. Playlist (Adnane) — `playlists/{event_id}`

```
event_id,
sections: [{ id, label (entrée salle, ouverture bal, gâteau, soirée…),
             linked_moment_id (→ day_plan, nullable), order,
             tracks: [{ id, title, artist, spotify_id|null,
                        flag: 'normal'|'must_play'|'banned', order }] }],
dj_share_token, updated_at
```

## Onglet « À venir » (Adnane)

Pas de collection : liste statique dans `src/lib/upcoming-features.ts`
(8 cartes, badge « Bientôt disponible »). Si un jour on veut le piloter en admin → `feature_flags`.

---

## Règles Firestore à ajouter (sécurité)

Le fallback actuel `allow read, write: if isSignedIn()` est **trop permissif**
pour la marketplace (n'importe quel connecté pourrait modifier les annonces
d'autrui). À ajouter lors de l'implémentation :

- `market_listings` : read public `status == 'active'` ; write = seller_id == uid
- `market_orders/payments/payouts` : pas d'accès client direct — **API routes uniquement**
- `market_favorites` : owner only
- `seating_plans`, `day_plans`, `gazettes`, `menus`, `playlists`,
  `photo_albums`, `guestbooks` : owner (event/client) only en écriture ;
  lecture via API pour les liens partagés
- `photo_album_items`, `guestbook_entries` : écriture **uniquement via API**
  (validation du `public_token` côté serveur)
