// Persistance des annonces — DIP : les services dépendent de l'interface
// ListingStore, jamais de Firestore directement. L'implémentation Firestore
// reçoit l'instance `db` par injection → remplaçable par un fake en tests.

import type { Firestore } from 'firebase-admin/firestore';
import { MarketListing, PublicListingFilters } from './types';
import { stripUndefined } from './utils';

export const MARKET_LISTINGS = 'market_listings';

export interface ListingStore {
  getById(id: string): Promise<MarketListing | null>;
  getBySlug(slug: string): Promise<MarketListing | null>;
  listBySeller(sellerId: string): Promise<MarketListing[]>;
  listPublic(filters: PublicListingFilters): Promise<MarketListing[]>;
  create(data: Omit<MarketListing, 'id'>): Promise<MarketListing>;
  update(id: string, patch: Partial<MarketListing>): Promise<void>;
  incrementViews(id: string): Promise<void>;
}

type DocSnap = { exists: boolean; id: string; data: () => Record<string, any> };

const toListing = (d: DocSnap): MarketListing => ({ ...d.data(), id: d.id }) as MarketListing;

export function createFirestoreListingStore(db: Firestore): ListingStore {
  const col = () => db.collection(MARKET_LISTINGS);

  return {
    async getById(id) {
      const snap = await col().doc(id).get();
      return snap.exists ? toListing(snap as DocSnap) : null;
    },

    async getBySlug(slug) {
      const snap = await col().where('slug', '==', slug).limit(1).get();
      const doc = snap.docs[0];
      return doc ? toListing(doc as DocSnap) : null;
    },

    async listBySeller(sellerId) {
      const snap = await col().where('seller_id', '==', sellerId).get();
      return snap.docs
        .map((d) => toListing(d as DocSnap))
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    },

    // Filtres avancés appliqués en mémoire (même approche que /api/public/vendors) :
    // Firestore ne sait pas faire recherche plein-texte ni OR multi-champs.
    async listPublic(filters) {
      const snap = await col()
        .where('status', '==', 'active')
        .limit(500)
        .get();

      let items = snap.docs.map((d) => toListing(d as DocSnap));

      if (filters.category) items = items.filter((l) => l.category === filters.category);
      if (filters.subcategory) items = items.filter((l) => l.subcategory === filters.subcategory);
      if (filters.condition) items = items.filter((l) => l.condition === filters.condition);
      if (filters.minPrice != null) items = items.filter((l) => l.price >= filters.minPrice!);
      if (filters.maxPrice != null) items = items.filter((l) => l.price <= filters.maxPrice!);
      if (filters.city) {
        const city = filters.city.toLowerCase();
        items = items.filter((l) => l.location?.city?.toLowerCase().includes(city));
      }
      if (filters.q) {
        const q = filters.q.toLowerCase();
        items = items.filter(
          (l) =>
            l.title.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q)
        );
      }

      switch (filters.sort) {
        case 'price_asc':
          items.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          items.sort((a, b) => b.price - a.price);
          break;
        case 'relevance':
          items.sort((a, b) => (b.favorites_count || 0) - (a.favorites_count || 0));
          break;
        default:
          items.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
      }

      const offset = filters.offset ?? 0;
      const limit = filters.limit ?? 24;
      return items.slice(offset, offset + limit);
    },

    async create(data) {
      const ref = await col().add(stripUndefined(data));
      return { ...data, id: ref.id };
    },

    async update(id, patch) {
      await col().doc(id).set(stripUndefined(patch), { merge: true });
    },

    async incrementViews(id) {
      // Incrément atomique — pas de read-modify-write.
      const { FieldValue } = await import('firebase-admin/firestore');
      await col().doc(id).update({ views_count: FieldValue.increment(1) });
    },
  };
}
