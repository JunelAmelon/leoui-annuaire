---
name: firestore-schema-solid
description: Règles obligatoires pour tout développement touchant Firestore, les collections du sprint (market_*, guestbooks, gazettes, menus, playlists, seating_plans, day_plans, photo_albums) ou une API route. À activer dès qu'on lit/écrit des données, crée une feature, un repository, un service ou une requête Firestore dans leoui-annuaire. Impose de suivre docs/FIRESTORE_SCHEMA.md, les principes SOLID/DIP et l'optimisation des lectures.
---

# Firestore Schema + SOLID — Le Oui Parfait

## 0. Avant d'écrire une ligne de code (obligatoire)
1. **Lire `docs/FIRESTORE_SCHEMA.md`** en entier pour la collection concernée.
2. Utiliser **exactement** les noms de collections/champs/statuts du schéma (snake_case, unions de statuts, dates ISO 8601).
3. Si la feature a besoin d'un champ/collection absent : **ne pas improviser**. Proposer la modification du schéma, mettre à jour `FIRESTORE_SCHEMA.md` dans le même commit, et prévenir l'autre dev (Junel/Adnane) : le doc est le contrat anti-collision de merge.
4. Ne jamais toucher aux collections de l'autre dev (`market_*`, `seating_plans`, `day_plans`, `photo_*` = Junel ; `guestbooks`, `gazettes`, `menus`, `playlists` = Adnane) sans accord.

## 1. Conventions de données
- Champs `snake_case`; `created_at` / `updated_at` sur toute entité mutable (ISO string, posés **côté serveur/repository**, jamais par l'UI).
- Lien au mariage : `event_id`. Pas de nouveau lien parallèle.
- Un doc par événement ⇒ **ID du doc = `event_id`** (gazettes, menus, playlists, seating_plans, day_plans) → lecture par `getDoc`, jamais par `where`.
- Pas de booléens ambigus pour un état : union de strings.
- Pas de duplication de source de vérité (ex. régimes alimentaires = calculés depuis `guests`).
- Dénormalisation autorisée **uniquement** si documentée dans le schéma (ex. `listing_snapshot`, compteurs).

## 2. Accès & sécurité
- Données invité sans compte (`public_token`) : **API route + `adminDb` uniquement**, validation du token côté serveur, token = `crypto.randomUUID()`. Jamais via `src/lib/db.ts`.
- Opérations financières (`market_orders|payments|payouts`) : API route uniquement, transaction, `idempotency_key`, entrée dans `market_audit_log`.
- Toute nouvelle collection ⇒ ajouter/mettre à jour sa règle dans `firestore.rules` (ne pas compter sur le fallback `isSignedIn()`).
- Valider les entrées API (types, tailles, statuts autorisés, transitions de statut valides) avant écriture. Ne jamais faire confiance à `owner_id`/`seller_id` venant du body : le déduire du token d'authentification.

## 3. Architecture SOLID / DIP
Structure par feature :
```
src/features/<feature>/
  domain/        types, unions de statuts, règles métier pures (aucun import firebase)
  repositories/  interface <X>Repository + implémentation Firestore
  services/      cas d'usage, dépendent des INTERFACES de repository
  ui/ (ou components/) composants React, aucun appel Firestore direct
src/app/api/<feature>/route.ts   → fine couche : auth, validation, appel du service
```
- **S** : un fichier = une responsabilité (validation ≠ accès données ≠ UI ≠ PDF/export).
- **O** : ajouter un statut/type via extension (map/strategy), pas en empilant des `if`.
- **L** : toute implémentation d'un repository respecte le contrat de l'interface (mémoire pour tests, Firestore en prod).
- **I** : interfaces petites (`GuestbookReader`, `GuestbookWriter`) plutôt qu'un repository fourre-tout.
- **D (DIP)** : services et composants dépendent d'abstractions injectées (constructeur / factory), jamais de `firebase/firestore` ou `adminDb` directement. L'instanciation concrète se fait à un seul endroit (composition root / route).
- Interdit : `getDocs/addDoc/...` dans un composant React ou dans un `page.tsx`.
- Types : pas de `any` ni `DocumentData` en sortie de repository ; mapper vers les types du domaine.
- DRY/KISS : réutiliser `src/lib/utils.ts`, composants `src/components/ui`; ne pas dupliquer de helper existant.

## 4. Optimisation des requêtes Firestore (coût = nb de lectures)
1. **Lecture par ID > requête.** Utiliser l'ID déterministe (`event_id`, `buyerId_listingId`).
2. **Toujours borner** : `limit()` + pagination par curseur (`startAfter`), jamais de `getDocs` d'une collection entière. `db.ts#getDocuments` n'a pas de limit : ne pas l'utiliser pour des listes non bornées ; étendre le repository.
3. **Filtrer côté serveur Firestore**, pas en JS après coup (`hidden == false`, `status == 'active'`, `rsvp == 'confirmed'`).
4. **Index composites** : toute requête `where` + `orderBy` sur champs différents ⇒ ajouter l'entrée dans `firestore.indexes.json` (le créer s'il manque) et la lister dans la PR.
5. **Compter sans lire** : `getCountFromServer()` / `count()` ; sommes via compteurs agrégés ou `aggregate`.
6. **Compteurs** : `increment()` atomique ; max ~1 écriture/s par doc ⇒ pas de compteur chaud (vues) sur un doc très sollicité : batcher ou sharder.
7. **Atomicité** : `runTransaction` (stock `quantity_reserved`, statut commande+paiement) ; `writeBatch` pour écritures multiples indépendantes (≤500).
8. **Mises à jour partielles** : `updateDoc` avec chemins (`'tables.3.x'`/champs précis) plutôt que réécrire un gros doc (évite d'écraser les modifs concurrentes couple/planner).
9. **Pas de listeners `onSnapshot` inutiles** : réservés au « live » (jour J, diaporama, messages) ; toujours `unsubscribe` au démontage ; ciblés et bornés.
10. **Tableaux non bornés interdits** dans un doc (limite 1 Mo) : `events`, `history`, `vendor_requests`, messages, entries ⇒ sous-collection/collection séparée si la croissance est illimitée.
11. **Projection** : en API admin, utiliser `.select(...)` pour ne lire que les champs utiles (listes, cartes d'annonces).
12. **Éviter N+1** : ne pas lire un doc par élément de liste ; dénormaliser le minimum documenté ou batcher avec `where(documentId(), 'in', [≤30 ids])`.
13. **Cache** : mémoïser/SWR côté client pour données quasi statiques (`market_categories`, `market_settings/global`, villes) ; `revalidate`/cache Next pour les routes publiques.
14. **Recherche texte** : Firestore ne sait pas faire de full-text ; ne pas simuler avec `>=`/`<=` coûteux hors préfixe simple sur `slug`. Pour la marketplace, prévoir un moteur externe si besoin.
15. Médias (audio/photos) : jamais en base ; Storage + chemin dans le doc (`audio_path`, `storage_path`), URLs signées courte durée, miniatures (`thumb_path`).

## 5. Checklist avant de rendre le code
- [ ] Champs/statuts conformes à `FIRESTORE_SCHEMA.md` (et doc mis à jour si changement)
- [ ] Règles `firestore.rules` + index `firestore.indexes.json` à jour
- [ ] Aucun accès Firestore dans UI/page ; dépendances injectées (DIP)
- [ ] Toutes les requêtes bornées, filtrées, paginées ; pas de N+1
- [ ] Accès invité/financier uniquement via API route + `adminDb`
- [ ] `created_at`/`updated_at` gérés par le repository
- [ ] Test unitaire du service avec un repository en mémoire
- [ ] `npm run typecheck` et `npm run lint` passent

