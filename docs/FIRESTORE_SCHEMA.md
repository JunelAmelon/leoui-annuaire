# Schémas Firestore partagés — Sprint Novembre 2026

> **À valider par Junel & Adnane avant tout dev.** Document de référence pour les
> collections des 8 fonctionnalités du sprint. Objectif : éviter les collisions de
> merge du vendredi et garantir un nommage cohérent.
>
> **Révision 2** : voir le journal des changements en fin de document. Les points
> marqués **[À VALIDER]** nécessitent l'accord de l'autre dev avant d'être codés.

## Conventions communes

- **Snake_case** pour tous les champs (`created_at`, `event_id`…)
- **Dates** : chaînes ISO 8601 complètes avec date (`new Date().toISOString()`).
  `created_at` / `updated_at` sont posés **côté serveur / repository**, jamais par l'UI.
- **Horodatage systématique** : `created_at`, `updated_at` sur toute entité mutable
- **Lien au mariage** : `event_id` (doc `events`) — **obligatoire sur toute nouvelle
  collection**. Plus de fallback `client_id` sur les nouvelles collections.
  (`guests` existant garde `client_id` en lecture seule le temps de la migration, voir §Migration.)
- **Propriétaire** : toute collection liée à un mariage porte aussi `owner_id` (uid du
  couple propriétaire) pour que les règles Firestore ne lisent pas `events` à chaque accès.
- **ID déterministe** : quand il n'y a qu'un doc par mariage, **ID du doc = `event_id`**
  (lecture par `getDoc`, aucune requête, aucun index).
- **Accès invité sans compte** (album photo, livre d'or, DJ, prestataires) : `public_token`
  opaque → **passage obligatoire par une API route** (`adminDb`), jamais par les helpers
  client `db.ts`. Le token est `crypto.randomUUID()`, jamais prévisible. Chaque token
  porte `token_revoked_at: string | null` (révocable) et optionnellement `token_expires_at`.
- **Statuts** : unions de strings explicites, jamais de booléens ambigus.
- **Accès serveur** : `adminDb` (firebase-admin) dans les API routes ; accès client
  `db.ts` uniquement pour les données de l'utilisateur connecté.
- **Tableaux bornés** : un tableau dans un doc doit avoir une taille maximale connue.
  Si la croissance est illimitée → **sous-collection**.
- **Écritures concurrentes** : sur les gros docs partagés (plan de table, planning,
  playlist, gazette), écrire **par chemin de champ** (`updateDoc(ref, { 'assignments.t1_3': id })`)
  ou en transaction, jamais réécrire le doc entier.
- **Médias** : jamais en base. Chemin Storage dans le doc (`*_path`), upload par
  **URL signée générée par l'API**, URL de lecture signée à courte durée.
- **Suppression** : la suppression d'un mariage/livre d'or/album supprime en cascade
  (côté serveur) les docs liés et les fichiers Storage (RGPD).

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
Toute transition de statut est **validée côté serveur** selon les matrices ci-dessous.

### `market_seller_profiles/{uid}`
Profil vendeur — requis avant la 1re annonce (RM-004). Indépendant du profil mariage.
```
uid, display_name (public), status: 'particulier' | 'professionnel',
phone, address { street, city, postal_code, country },
psp_account_id (ex: stripe_connect_id / mangopay_user_id), psp_onboarded: bool,
verified: { email, phone, identity, payout },
rating_avg, rating_count,   // mis à jour dans la MÊME transaction que la création de l'avis
created_at, updated_at
```

### `market_listings/{id}`
```
seller_id, title, slug, description,
category, subcategory,
price: number, quantity, quantity_reserved,   // réservation panier/paiement (RM-010)
reservations: sous-collection market_listings/{id}/reservations/{order_id}
              { quantity, reserved_until }     // expire → libère le stock
condition: 'neuf' | 'comme_neuf' | 'bon_etat' | 'usage',
images: string[]  // chemins Storage, max 10
attributes { dimensions, material, color, defects },
location: { city, postal_code, approx_lat, approx_lng, geohash }, // approximative, jamais l'adresse exacte
delivery: { shipping: bool, shipping_cost, pickup: bool },
status: 'draft' | 'pending_review' | 'active' | 'paused'
      | 'sold' | 'exhausted' | 'suspended' | 'removed',
views_count, favorites_count,   // voir « Compteurs » ci-dessous
moderation_note, published_at, created_at, updated_at
```
- **`reserved` supprimé des statuts** : l'état « réservé » se déduit de
  `quantity - quantity_reserved == 0`. Une seule source de vérité.
- `quantity_reserved` est modifié **uniquement en transaction**, avec la sous-collection
  `reservations` (expiration `reserved_until`, nettoyée par job planifié).
- **Compteurs** : `favorites_count` mis à jour dans la même transaction que
  `market_favorites`. `views_count` ne s'incrémente **pas à chaque vue** : on bufferise
  côté API (batch toutes les N vues/minute) ou on répartit en `market_listing_counters/{listing_id}/shards/{0..9}`.
- **Recherche** : filtres par `category`, `status`, `price`, `geohash`. La recherche
  texte libre n'est **pas** faite par Firestore → **Algolia/Typesense** si une barre de
  recherche est livrée (**[À VALIDER]**, hors sprint sinon : filtres + préfixe sur `slug`).

### `market_orders/{id}`
```
listing_id, listing_snapshot { title, image, price }, // fige l'annonce à l'achat
buyer_id, seller_id, quantity,
delivery_mode: 'shipping' | 'pickup',
shipping_address {...} (si shipping),
pickup_code_hash (hash du code de remise à usage unique, si pickup),
amounts { items, shipping, service_fee, total },
order_status: 'pending_payment' | 'paid' | 'preparing'
  | 'shipped' | 'pickup_scheduled' | 'delivered'
  | 'receipt_confirmed' | 'completed'
  | 'cancelled' | 'payment_failed' | 'disputed' | 'refunding' | 'refunded',
tracking { carrier, number, shipped_at, delivered_at },
receipt_confirmed_at,
created_at, updated_at
```
Sous-collection : `market_orders/{id}/history/{id}` → `{ status, at, by }`
(remplace le tableau `history`).

**Matrice de transitions `order_status`** **[À VALIDER]** :
```
pending_payment → paid | payment_failed | cancelled
paid            → preparing | cancelled | refunding | disputed
preparing       → shipped | pickup_scheduled | cancelled | refunding
shipped         → delivered | disputed
pickup_scheduled→ delivered | disputed
delivered       → receipt_confirmed | disputed
receipt_confirmed → completed
disputed        → completed | refunding
refunding       → refunded
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
created_at, updated_at
```
Sous-collection : `market_payments/{id}/events/{id}` → `{ type, at, payload_hash }`
(remplace le tableau `events`, peut dépasser 1 Mo sur webhooks répétés).

**Source de vérité** : `order_status` = ce que voit l'utilisateur ; `payment_status` = état
financier réel. Les deux sont changés **dans la même transaction** côté serveur
(`refunding`/`refunded` pilotent les deux). **[À VALIDER]** : modèle de séquestre — Stripe
Connect = autorisation/transfert différé, Mangopay = vrai wallet escrow. À trancher avant
de coder le paiement.

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
description, evidence: string[] (chemins Storage, max 10),
status: 'open' | 'awaiting_seller' | 'under_review'
  | 'resolved_buyer' | 'resolved_seller' | 'closed',
seller_response, resolution_note, decided_by, decided_at,
created_at, updated_at
```

### `market_reviews/{id}`
```
order_id (RM-018 : avis uniquement sur transaction réelle — unique ; utiliser order_id comme ID du doc),
reviewer_id, seller_id, listing_id,
rating: 1-5, comment, seller_reply, status: 'visible' | 'flagged' | 'removed',
created_at
```
Création de l'avis + mise à jour de `rating_avg`/`rating_count` du vendeur : **une transaction**.

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
Lue très souvent → à mettre en cache (Next `revalidate`).

### `market_settings/global`
```
commission_rate: 0.08, service_fee_rules, receipt_auto_confirm_days,
dispute_response_days, updated_by, updated_at
```
Doit exister (seed) **avant** le premier achat.

### `market_audit_log/{id}` — journalisation des opérations sensibles (RM-020)
```
actor_id, actor_role, action, entity_type, entity_id,
before_hash / details, at
```

### Phase 2 (définis maintenant, pas codés au sprint)
`market_conversations/{id}` : listing_id, order_id, buyer_id, seller_id, last_message_at
`market_messages/{id}` : conversation_id, sender_id, body, attachments, read_at
`market_reports/{id}` : listing_id, reporter_id, reason, status

### Index composites (Marketplace) — `firestore.indexes.json`
- `market_listings` : `status` + `published_at` (desc)
- `market_listings` : `category` + `status` + `price`
- `market_listings` : `seller_id` + `status` + `updated_at` (desc)
- `market_listings` : `location.geohash` + `status` (range geohash)
- `market_orders` : `buyer_id` + `created_at` (desc) ; `seller_id` + `created_at` (desc)
- `market_orders` : `order_status` + `updated_at` (jobs : auto-confirmation, relances)

---

## 2. Plan de table (Junel) — `seating_plans/{event_id}`

Un doc par mariage (1 canevas, ≤50 tables / ~300 chaises → tient dans 1 Mo).

```
event_id, owner_id,
tables: [{
  id, label, shape: 'round' | 'oval' | 'rect' | 'head',
  x, y, rotation, seats, color
}],
room_items: [{ id, type: 'dancefloor'|'bar'|'buffet'|'stage'|'dj'|'entrance'|'photobooth',
               x, y, w, h, rotation, label }],
assignments: { [seatKey: `${tableId}_${seatIndex}`]: guest_id }, // 1 chaise = 1 invité
background_path,   // chemin Storage
updated_at
```
- **Invariant « 1 invité = 1 place »** : la clé de `assignments` empêche 2 invités sur
  la même chaise, **pas** un invité sur 2 chaises. Vérifier côté serveur/transaction
  qu'un `guest_id` n'apparaît qu'une fois avant d'écrire.
- **Écriture par chemin** (`assignments.${seatKey}`) pour le glisser-déposer, pas
  de réécriture du doc entier (couple + planner simultanés).
- Invité supprimé ou RSVP ≠ confirmed : places orphelines purgées à l'export / à l'ouverture.
- Invités lus depuis `guests` (event_id, rsvp='confirmed'). Pas de duplication des invités.

## 3. Planning du jour J (Junel) — `day_plans/{event_id}`

```
event_id, owner_id,
days: {
  eve:   { date, items: TimelineItem[] },
  day:   { date, items: TimelineItem[] },
  after: { date, items: TimelineItem[] },
}
// TimelineItem (id STABLE : jamais modifié, référencé par la playlist et l'album) :
// { id, title, start_at (ISO 8601 COMPLET avec date, gère après minuit), end_at|null,
//   duration_min, category, location { name, address, travel_min },
//   people: string[], notes, vendor_ids: string[], sort_key }
share: { token, token_revoked_at, vendor_links: [{ vendor_id, token, token_revoked_at }] },
updated_at
```
Sous-collection : `day_plans/{event_id}/vendor_requests/{id}` →
`{ vendor_id, item_id, proposed_start_at, reason, status: 'pending'|'accepted'|'declined', created_at, decided_at }`
(remplace le tableau `vendor_requests`, écrit par les prestataires via API).
- `start_time` `'HH:mm'` supprimé : un seul format ISO complet.
- Suppression d'un `TimelineItem` : met à jour (via service) les `moment_id` de l'album
  et `linked_moment_id` de la playlist à `null`.

## 4. Album photo QR (Junel) — `photo_albums/{event_id}` + `photo_album_items/{id}`

`photo_albums/{event_id}` (un album par mariage) :
```
event_id, owner_id, title, public_token, token_revoked_at, token_expires_at,
photographer_album_url (album officiel à côté),
settings { max_photo_mb, max_photos_per_guest, moderation: bool },
created_at, updated_at
```
`photo_album_items/{id}` :
```
album_id (= event_id), event_id, owner_id,   // dupliqués pour les règles / requêtes
storage_path, thumb_path, mime_type, size_bytes,
status: 'processing' | 'ready' | 'rejected',   // miniature en cours de génération
guest_name, guest_key (identifiant anonyme de session, pour max_photos_per_guest),
comment, moment_id (nullable → TimelineItem.id du day_plan),
favorite: bool, hidden: bool, // modération
uploaded_at
```
- Upload par **URL signée** délivrée par l'API après vérification du token, du quota et
  du type MIME. Règles Storage : aucune écriture directe client.
- Export ZIP : job serveur asynchrone, plafonné.
- Index : `album_id` + `hidden` + `uploaded_at` (desc) ; `album_id` + `favorite` + `uploaded_at` (desc) ;
  `album_id` + `moment_id` + `uploaded_at`.

## 5. Livre d'or audio (Adnane) — `guestbooks/{event_id}` + `guestbook_entries/{id}`

`guestbooks/{event_id}` (un livre d'or par mariage) :
```
event_id, owner_id, title, public_token, token_revoked_at, token_expires_at,
settings { max_duration_sec, max_audio_mb, window_open_at, window_close_at },
created_at, updated_at
```
`guestbook_entries/{id}` :
```
guestbook_id (= event_id), event_id, owner_id,   // dupliqués pour les règles / requêtes
type: 'audio' | 'text',
status: 'pending_upload' | 'ready' | 'rejected',   // upload audio en 2 temps
audio_path, mime_type, size_bytes, duration_sec,
waveform: number[] (≤ 100 valeurs normalisées 0-1, si audio),
body (si text, max 2000 car.), guest_name, guest_key,
favorite: bool, hidden: bool,
created_at
```
- Dépôt uniquement via API : vérifie token, fenêtre `window_open_at/close_at`,
  `max_duration_sec`, taille, MIME (`audio/webm`, `audio/mp4`…), anti-spam par `guest_key`/IP.
- Audio : upload par **URL signée** générée par l'API ; règles Storage : aucune écriture
  ni lecture publique. Lecture via URL signée courte durée (y compris pour les QR du PDF :
  le QR pointe vers une route `/api/guestbook/listen/{entry_id}?t=…` qui vérifie puis redirige).
- Index : `guestbook_id` + `hidden` + `created_at` (desc) ; `guestbook_id` + `favorite` + `created_at` (desc).
- Pagination par curseur (`startAfter`) côté liste.

## 6. Gazette (Adnane) — `gazettes/{event_id}`

```
event_id, owner_id, title, cover_path,   // chemin Storage
sections: [{ id, type: 'story'|'anecdote'|'quiz'|'program'|'custom',
             title, content, order }],   // max 30 sections
// content d'une section 'quiz' : { questions: [{ question, options: string[], answer_index }] }
program_source: 'plan' | 'custom',   // remplace program_synced_from_plan + program_overridden
program_synced_at,                   // détecte un planning modifié depuis la synchro
layout: { theme, accent_color },
version: number,                     // détection de conflit d'édition
updated_at
```
Sauvegarde par section (chemin) ou transaction avec contrôle de `version`.

## 7. Menu (Adnane) — `menus/{event_id}`

```
event_id, owner_id,
courses: [{ id, key: 'vin_honneur'|'entree'|'plat'|'fromage'|'dessert'|'cafe',
            dishes: [{ id, name, note, status: 'envisage'|'a_valider'|'retenu' }] }],
dietary_notes, updated_at
```
Sous-collection : `menus/{event_id}/decisions/{id}` → `{ at, by, change }`
(remplace le tableau `decision_log`, historique illimité).
Compteurs régimes calculés à la volée depuis `guests.menu` / `menu_other`
(pas de duplication — source de vérité = `guests`). Une requête `guests` par
`event_id` ; résultat mis en cache le temps de l'écran/PDF.

## 8. Playlist (Adnane) — `playlists/{event_id}`

```
event_id, owner_id,
sections: [{ id, label (entrée salle, ouverture bal, gâteau, soirée…),
             linked_moment_id (→ TimelineItem.id du day_plan, nullable), order }],
dj_share_token, dj_token_revoked_at, updated_at
```
Sous-collection : `playlists/{event_id}/tracks/{id}` →
```
section_id, title, artist, spotify_id|null,
preview_url|null, cover_url|null,   // cache Spotify, évite les rappels API
flag: 'normal'|'must_play'|'banned', order, created_at
```
(remplace `sections[].tracks[]` : plusieurs éditeurs sans conflit, pas de limite de taille.)
Si le moment lié du planning est supprimé → `linked_moment_id = null` (via service).
Export DJ / PDF : lecture de `tracks` filtrée par `flag` (index `section_id` + `order`).

## Onglet « À venir » (Adnane)

Pas de collection : liste statique dans `src/lib/upcoming-features.ts`
(8 cartes, badge « Bientôt disponible »). Si un jour on veut le piloter en admin → `feature_flags`.

---

## Règles Firestore à ajouter (sécurité)

Le fallback actuel `allow read, write: if isSignedIn()` est **trop permissif**
pour la marketplace (n'importe quel connecté pourrait modifier les annonces
d'autrui). À ajouter **dans le même commit que chaque collection** :

- `market_listings` : read public `status == 'active'` ; write = seller_id == uid, et
  champs protégés (`seller_id`, `status` modération, `quantity_reserved`, compteurs) non modifiables par le client
- `market_orders/payments/payouts/disputes/audit_log` : pas d'accès client direct — **API routes uniquement**
- `market_favorites` : owner only
- `seating_plans`, `day_plans`, `gazettes`, `menus`, `playlists`,
  `photo_albums`, `guestbooks` : `resource.data.owner_id == request.auth.uid` en
  écriture (et planner assigné via claim) ; lecture via API pour les liens partagés
- `photo_album_items`, `guestbook_entries` : écriture **uniquement via API**
  (validation du `public_token` côté serveur) ; lecture par `owner_id`
- Champs verrouillés à la mise à jour : `owner_id`, `event_id`, `public_token`,
  `seller_id`, `commission_rate` (comme `hasAny([...])` déjà utilisé pour `venue`)
- **Storage** (`storage.rules` à créer) : aucune écriture client directe sur
  `guestbook/`, `album/`, `market/` ; uploads via URL signée.

## Migration des collections existantes

`guests` porte déjà `event_id` ET `client_id`. Les nouvelles collections n'utilisent que `event_id`.
Ne supprimer le fallback `client_id` de `invites/page.tsx`, `mariage/page.tsx` et
`espace-client/page.tsx` qu'après backfill et vérification (script idempotent, dry-run d'abord).

## Journal des changements (Révision 2)

| Changement | Sections |
|---|---|
| `event_id` obligatoire, plus de fallback sur nouvelles collections ; `owner_id` partout | Conventions, 2-8 |
| ID = `event_id` pour `guestbooks`, `photo_albums` | 4, 5 |
| `event_id` + `owner_id` dupliqués dans `photo_album_items`, `guestbook_entries` | 4, 5 |
| Tableaux → sous-collections : `history`, `events`, `vendor_requests`, `decision_log`, `tracks` | 1, 3, 7, 8 |
| Écriture par chemin / transaction sur gros docs ; `version` gazette | Conventions, 2, 6 |
| `status 'reserved'` supprimé ; `reservations` avec expiration ; compteurs bufferisés/shardés | 1 |
| `geohash` ajouté ; recherche texte → Algolia/Typesense **[À VALIDER]** | 1 |
| `waveform` ≤ 100 pts ; upload audio/photo par URL signée ; règles Storage | 4, 5, Règles |
| `start_time` → `start_at` ISO complet ; `TimelineItem.id` stable | 3 |
| `program_source` remplace 2 booléens ; structure `quiz` ; statut menu `a_valider` | 6, 7 |
| Tokens révocables/expirables | Conventions, 3, 4, 5, 8 |
| Matrice de transitions commande, source de vérité order/payment, séquestre **[À VALIDER]** | 1 |
| Index composites listés | 1, 4, 5, 8 |
