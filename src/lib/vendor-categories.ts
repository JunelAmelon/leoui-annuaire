export const VENDOR_CATEGORIES = [
  // Lieux de mariage
  'Domaine mariage',
  'Auberge mariage',
  'Hôtel mariage',
  'Restaurant mariage',
  'Salle mariage',
  'Château mariage',
  'Bateau mariage',
  'Mariages à la plage',
  // Traiteur & gourmandises
  'Traiteur mariage',
  'Wedding cake',
  // Papeterie & cadeaux
  'Faire part mariage',
  'Cadeaux invités mariage',
  'Liste de mariage',
  // Photo & vidéo
  'Photo mariage',
  'Vidéo mariage',
  // Musique & son
  'Musique mariage',
  // Transport
  'Voiture mariage',
  'Bus mariage',
  // Décoration & fleurs
  'Décoration mariage',
  'Fleurs mariage',
  'Chapiteau mariage',
  'Animation mariage',
  // Planning
  'Organisation mariage',
  'Wedding Planner',
  'Lune de miel',
  // Officiants & cérémonie
  'Officiants',
  // Boissons & food
  'Food Truck',
  'Vin et Spiritueux',
  // Bijoux & accessoires
  'Bijoux mariage',
  // Mariée
  'Robe de mariée',
  'Accessoires mariage',
  'Robe de cocktail',
  'Esthétique coiffure mariage',
  // Marié
  'Costumes mariage',
  'Soins beauté',
  'Accessoires marié',
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

// Anciens noms de catégories (liens existants, SEO, favoris) → catégories actuelles.
export const LEGACY_CATEGORY_MAP: Record<string, string[]> = {
  'Photographes': ['Photo mariage'],
  'Photographe': ['Photo mariage'],
  'Vidéastes': ['Vidéo mariage'],
  'Vidéaste': ['Vidéo mariage'],
  'Fleuristes': ['Fleurs mariage', 'Décoration mariage'],
  'Fleuriste': ['Fleurs mariage', 'Décoration mariage'],
  'Traiteurs': ['Traiteur mariage', 'Wedding cake', 'Food Truck', 'Vin et Spiritueux'],
  'Traiteur': ['Traiteur mariage'],
  'DJ & Musiciens': ['Musique mariage'],
  'DJ': ['Musique mariage'],
  'Musiciens': ['Musique mariage'],
  'Lieu de réception': ['Domaine mariage', 'Auberge mariage', 'Hôtel mariage', 'Restaurant mariage', 'Salle mariage', 'Château mariage', 'Bateau mariage', 'Mariages à la plage'],
  'Faire-part': ['Faire part mariage'],
  'Cadeaux invités': ['Cadeaux invités mariage'],
  'Transport': ['Voiture mariage', 'Bus mariage'],
  'Animations': ['Animation mariage'],
  'Agences de voyage': ['Lune de miel'],
  'Pâtissiers': ['Wedding cake'],
  'Pâtissier': ['Wedding cake'],
  'Boutiques de robes': ['Robe de mariée', 'Robe de cocktail'],
  'Accessoires': ['Accessoires mariage', 'Accessoires marié'],
  'Bijoux': ['Bijoux mariage'],
  'Coiffeurs & Maquilleurs': ['Esthétique coiffure mariage', 'Soins beauté'],
  'Costumes': ['Costumes mariage'],
};

// Toutes les valeurs de `v.category` qui doivent matcher `category` :
// - si `category` est un ancien nom → ses catégories cibles + l'ancien nom
// - si `category` est un nom actuel → lui-même + les anciens noms qui y renvoient
//   (pour les prestataires enregistrés avec l'ancienne taxonomie)
export function categoryMatchValues(category: string): string[] {
  const matches = new Set<string>([category]);
  for (const t of LEGACY_CATEGORY_MAP[category] || []) matches.add(t);
  for (const [legacy, targets] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (targets.includes(category)) matches.add(legacy);
  }
  return [...matches];
}

export const VENDOR_CATEGORY_GROUPS = [
  {
    label: 'Lieux de mariage',
    items: ['Domaine mariage', 'Auberge mariage', 'Hôtel mariage', 'Restaurant mariage', 'Salle mariage', 'Château mariage', 'Bateau mariage', 'Mariages à la plage'],
  },
  {
    label: 'Traiteur & gourmandises',
    items: ['Traiteur mariage', 'Wedding cake'],
  },
  {
    label: 'Papeterie & cadeaux',
    items: ['Faire part mariage', 'Cadeaux invités mariage', 'Liste de mariage'],
  },
  {
    label: 'Photo & vidéo',
    items: ['Photo mariage', 'Vidéo mariage'],
  },
  {
    label: 'Musique & son',
    items: ['Musique mariage'],
  },
  {
    label: 'Transport',
    items: ['Voiture mariage', 'Bus mariage'],
  },
  {
    label: 'Décoration & fleurs',
    items: ['Décoration mariage', 'Fleurs mariage', 'Chapiteau mariage', 'Animation mariage'],
  },
  {
    label: 'Planning & organisation',
    items: ['Organisation mariage', 'Wedding Planner', 'Lune de miel'],
  },
  {
    label: 'Cérémonie',
    items: ['Officiants'],
  },
  {
    label: 'Boissons & food',
    items: ['Food Truck', 'Vin et Spiritueux'],
  },
  {
    label: 'Bijoux & accessoires',
    items: ['Bijoux mariage'],
  },
  {
    label: 'Mariée',
    items: ['Robe de mariée', 'Accessoires mariage', 'Robe de cocktail', 'Esthétique coiffure mariage'],
  },
  {
    label: 'Marié',
    items: ['Costumes mariage', 'Soins beauté', 'Accessoires marié'],
  },
];
