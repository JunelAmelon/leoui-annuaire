// Catégories LeOui Market — CDC §2.2.
// Administrables en base via `market_categories` ; cette liste sert de seed
// et de référence de validation côté serveur.

export interface MarketCategory {
  slug: string;
  label: string;
  subcategories: { slug: string; label: string }[];
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    slug: 'decoration',
    label: 'Décoration',
    subcategories: [
      { slug: 'vases-bougeoirs', label: 'Vases & bougeoirs' },
      { slug: 'fleurs-artificielles', label: 'Fleurs artificielles' },
      { slug: 'centres-de-table', label: 'Centres de table' },
    ],
  },
  {
    slug: 'art-de-la-table',
    label: 'Art de la table',
    subcategories: [
      { slug: 'vaisselle', label: 'Assiettes & verres' },
      { slug: 'couverts', label: 'Couverts' },
      { slug: 'plateaux', label: 'Plateaux & service' },
    ],
  },
  {
    slug: 'mobilier',
    label: 'Mobilier',
    subcategories: [
      { slug: 'chaises-tables', label: 'Chaises & tables' },
      { slug: 'arches', label: 'Arches' },
      { slug: 'presentoirs', label: 'Présentoirs' },
    ],
  },
  {
    slug: 'papeterie',
    label: 'Papeterie',
    subcategories: [
      { slug: 'menus-panneaux', label: 'Menus & panneaux' },
      { slug: 'faire-part', label: 'Faire-part' },
      { slug: 'signaletique', label: 'Signalétique' },
    ],
  },
  {
    slug: 'accessoires',
    label: 'Accessoires',
    subcategories: [
      { slug: 'boites-cadeaux', label: 'Boîtes à cadeaux' },
      { slug: 'paniers', label: 'Paniers' },
      { slug: 'reception', label: 'Accessoires de réception' },
    ],
  },
  {
    slug: 'tenues-et-accessoires',
    label: 'Tenues et accessoires',
    subcategories: [
      { slug: 'robes', label: 'Robes' },
      { slug: 'costumes', label: 'Costumes' },
      { slug: 'chaussures-bijoux', label: 'Chaussures & bijoux' },
    ],
  },
  {
    slug: 'eclairage-et-animation',
    label: 'Éclairage et animation',
    subcategories: [
      { slug: 'guirlandes', label: 'Guirlandes' },
      { slug: 'projecteurs', label: 'Projecteurs & lumineux' },
      { slug: 'animation', label: 'Accessoires d\'animation' },
    ],
  },
  {
    slug: 'materiel-evenementiel',
    label: 'Matériel événementiel',
    subcategories: [
      { slug: 'photobooth', label: 'Photobooth' },
      { slug: 'supports', label: 'Supports & structures' },
      { slug: 'reception-materiel', label: 'Équipements de réception' },
    ],
  },
];

export const CONDITION_LABELS: Record<string, string> = {
  neuf: 'Neuf',
  comme_neuf: 'Comme neuf',
  bon_etat: 'Bon état',
  usage: 'Occasion',
};

export const MARKET_CATEGORY_SLUGS = new Set(MARKET_CATEGORIES.map((c) => c.slug));

export function isValidMarketCategory(slug: string): boolean {
  return MARKET_CATEGORY_SLUGS.has(slug);
}

export function isValidMarketSubcategory(categorySlug: string, subSlug: string): boolean {
  const cat = MARKET_CATEGORIES.find((c) => c.slug === categorySlug);
  return !!cat?.subcategories.some((s) => s.slug === subSlug);
}
