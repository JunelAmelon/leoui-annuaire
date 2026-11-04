// Règles métier des annonces — SRP : le service orchestre validation,
// ownership et transitions de statut. DIP : reçoit le ListingStore par
// injection (factory), jamais instancié en dur → testable sans Firestore.

import { ListingStore } from './listing-store';
import {
  CreateListingInput,
  MarketListing,
  PublicListingFilters,
  UpdateListingInput,
} from './types';
import { ConflictError, ForbiddenError, NotFoundError } from './errors';

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

export function createListingService(store: ListingStore) {
  return {
    async listPublic(filters: PublicListingFilters): Promise<MarketListing[]> {
      return store.listPublic(filters);
    },

    async getPublic(idOrSlug: string): Promise<MarketListing> {
      const listing =
        (await store.getBySlug(idOrSlug)) ?? (await store.getById(idOrSlug));
      if (!listing || !['active', 'reserved', 'sold', 'exhausted'].includes(listing.status)) {
        throw new NotFoundError('Annonce introuvable');
      }
      await store.incrementViews(listing.id);
      return listing;
    },

    async listMine(sellerId: string): Promise<MarketListing[]> {
      return store.listBySeller(sellerId);
    },

    async create(sellerId: string, input: CreateListingInput): Promise<MarketListing> {
      const now = new Date().toISOString();
      const listing: Omit<MarketListing, 'id'> = {
        seller_id: sellerId,
        title: input.title,
        // Suffixe aléatoire : unicité sans requête de vérification.
        slug: `${slugify(input.title)}-${Math.random().toString(36).slice(2, 8)}`,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory ?? null,
        price: input.price,
        quantity: input.quantity,
        quantity_reserved: 0,
        condition: input.condition,
        images: input.images,
        attributes: input.attributes,
        location: input.location,
        delivery: input.delivery,
        // Politique retenue : publication immédiate, modération a posteriori
        // (signalement + actions admin). Inverser en 'pending_review' si besoin.
        status: 'active',
        views_count: 0,
        favorites_count: 0,
        moderation_note: null,
        published_at: now,
        created_at: now,
        updated_at: now,
      };
      return store.create(listing);
    },

    async update(sellerId: string, id: string, patch: UpdateListingInput): Promise<MarketListing> {
      const listing = await store.getById(id);
      if (!listing || listing.status === 'removed') throw new NotFoundError('Annonce introuvable');
      if (listing.seller_id !== sellerId) throw new ForbiddenError('Cette annonce ne vous appartient pas');
      // RM : pas de suppression/modif libre si l'annonce est engagée dans une transaction.
      if (['reserved', 'sold'].includes(listing.status) && patch.status === 'draft') {
        throw new ConflictError('Annonce engagée dans une transaction');
      }
      const safePatch: Partial<MarketListing> = { ...patch, updated_at: new Date().toISOString() };
      // Champs interdits : on ne réécrit jamais la propriété ni les compteurs.
      delete (safePatch as any).seller_id;
      delete (safePatch as any).views_count;
      delete (safePatch as any).favorites_count;
      delete (safePatch as any).quantity_reserved;
      await store.update(id, safePatch);
      return { ...listing, ...safePatch };
    },

    async remove(sellerId: string, id: string): Promise<void> {
      const listing = await store.getById(id);
      if (!listing || listing.status === 'removed') throw new NotFoundError('Annonce introuvable');
      if (listing.seller_id !== sellerId) throw new ForbiddenError('Cette annonce ne vous appartient pas');
      if (['reserved', 'sold'].includes(listing.status)) {
        // Suppression interdite si transaction en cours — soft-delete sinon.
        throw new ConflictError('Annonce engagée dans une transaction : suppression impossible');
      }
      await store.update(id, { status: 'removed', updated_at: new Date().toISOString() });
    },
  };
}

export type ListingService = ReturnType<typeof createListingService>;
