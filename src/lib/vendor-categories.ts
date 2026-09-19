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
