// Validation des entrées LeOui Market — SRP : les routes API ne valident pas,
// elles délèguent ici. Lève ValidationError (code 400) avec le détail par champ.

import {
  CreateListingInput,
  ListingCondition,
  UpdateListingInput,
} from './types';
import { isValidMarketCategory, isValidMarketSubcategory } from './categories';
import { ValidationError } from './errors';

const CONDITIONS: ListingCondition[] = ['neuf', 'comme_neuf', 'bon_etat', 'usage'];
const MAX_IMAGES = 10;
const IMAGE_URL_RE = /^https?:\/\//i;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

function toPositiveNumber(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function validateListingInput(body: unknown): CreateListingInput {
  const b = (body ?? {}) as Record<string, any>;
  const fields: Record<string, string> = {};

  const title = str(b.title);
  if (title.length < 3 || title.length > 120) fields.title = 'Titre requis (3 à 120 caractères)';

  const description = str(b.description);
  if (description.length < 10 || description.length > 5000)
    fields.description = 'Description requise (10 à 5000 caractères)';

  const category = str(b.category);
  if (!isValidMarketCategory(category)) fields.category = 'Catégorie invalide';

  const subcategory = str(b.subcategory) || undefined;
  if (subcategory && !isValidMarketSubcategory(category, subcategory))
    fields.subcategory = 'Sous-catégorie invalide';

  const price = toPositiveNumber(b.price);
  // RM-006 : prix strictement positif
  if (!(price > 0)) fields.price = 'Prix requis (> 0 €)';

  const quantity = Math.floor(toPositiveNumber(b.quantity));
  if (!(quantity >= 1)) fields.quantity = 'Quantité requise (≥ 1)';

  const condition = str(b.condition) as ListingCondition;
  if (!CONDITIONS.includes(condition)) fields.condition = 'État invalide';

  const images = Array.isArray(b.images) ? b.images.map(str).filter(Boolean) : [];
  if (images.length === 0) fields.images = 'Au moins une photo requise';
  else if (images.length > MAX_IMAGES) fields.images = `Maximum ${MAX_IMAGES} photos`;
  else if (images.some((u: string) => !IMAGE_URL_RE.test(u))) fields.images = 'URLs de photos invalides';

  const loc = (b.location ?? {}) as Record<string, any>;
  const city = str(loc.city);
  if (!city) fields.location = 'Ville requise';

  const del = (b.delivery ?? {}) as Record<string, any>;
  const shipping = del.shipping === true;
  const pickup = del.pickup === true;
  if (!shipping && !pickup) fields.delivery = 'Choisir livraison et/ou remise en main propre';

  const shippingCost = toPositiveNumber(del.shipping_cost);
  if (shipping && !(shippingCost >= 0)) fields.shipping_cost = 'Frais de livraison invalides';

  if (Object.keys(fields).length) {
    throw new ValidationError('Annonce invalide', fields);
  }

  const attributes = (b.attributes ?? {}) as Record<string, any>;

  return {
    title,
    description,
    category,
    subcategory,
    price: Math.round(price * 100) / 100,
    quantity,
    condition,
    images,
    attributes: {
      dimensions: str(attributes.dimensions) || undefined,
      material: str(attributes.material) || undefined,
      color: str(attributes.color) || undefined,
      defects: str(attributes.defects) || undefined,
    },
    location: {
      city,
      postal_code: str(loc.postal_code) || undefined,
      approx_lat: Number.isFinite(Number(loc.approx_lat)) ? Number(loc.approx_lat) : undefined,
      approx_lng: Number.isFinite(Number(loc.approx_lng)) ? Number(loc.approx_lng) : undefined,
    },
    delivery: {
      shipping,
      shipping_cost: shipping ? Math.round(shippingCost * 100) / 100 : undefined,
      pickup,
    },
  };
}

export function validateListingPatch(body: unknown): UpdateListingInput {
  const b = (body ?? {}) as Record<string, any>;
  const patch: UpdateListingInput = {};

  // Réutilise la validation complète sur un objet fusionné côté appelant ;
  // ici on valide uniquement les champs présents.
  if ('status' in b) {
    if (!['draft', 'active', 'paused'].includes(b.status)) {
      throw new ValidationError('Statut invalide', { status: 'draft | active | paused attendu' });
    }
    patch.status = b.status;
  }

  const updatable = [
    'title', 'description', 'category', 'subcategory', 'price',
    'quantity', 'condition', 'images', 'attributes', 'location', 'delivery',
  ];
  if (!Object.keys(b).some((k) => updatable.includes(k))) {
    if (!patch.status) throw new ValidationError('Aucun champ modifiable fourni');
    return patch;
  }

  const merged = { ...b, status: undefined };
  const full = validateListingInput(merged);
  for (const key of updatable) {
    if (key in b) (patch as any)[key] = (full as any)[key];
  }
  return patch;
}

export function parsePublicFilters(params: URLSearchParams): import('./types').PublicListingFilters {
  const num = (k: string) => {
    const v = params.get(k);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const sort = params.get('sort');
  return {
    category: params.get('category') || undefined,
    subcategory: params.get('subcategory') || undefined,
    condition: CONDITIONS.includes(params.get('condition') as ListingCondition)
      ? (params.get('condition') as ListingCondition)
      : undefined,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    city: params.get('city') || undefined,
    q: params.get('q') || undefined,
    sort: ['recent', 'price_asc', 'price_desc', 'relevance'].includes(sort || '')
      ? (sort as 'recent' | 'price_asc' | 'price_desc' | 'relevance')
      : 'recent',
    limit: Math.min(Math.max(num('limit') ?? 24, 1), 60),
    offset: Math.max(num('offset') ?? 0, 0),
  };
}
