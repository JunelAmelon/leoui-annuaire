export type FeatureCategory =
  | 'all'
  | 'ceremonie'
  | 'animation'
  | 'voyage'
  | 'demarches'
  | 'papeterie'
  | 'logistique'
  | 'repas';

export interface UpcomingFeature {
  id: string;
  order: number;
  title: string;
  category: string;
  categoryKey: FeatureCategory;
  badge: string;
  description: string;
  keyBenefit: string;
  formatOrDeliverable: string;
  iconName: string;
}

export const FEATURE_CATEGORIES: { key: FeatureCategory; label: string }[] = [
  { key: 'all', label: 'Toutes les nouveautés' },
  { key: 'ceremonie', label: 'Cérémonie' },
  { key: 'animation', label: 'Animation' },
  { key: 'voyage', label: 'Voyage de noces' },
  { key: 'demarches', label: 'Démarches' },
  { key: 'papeterie', label: 'Papeterie' },
  { key: 'logistique', label: 'Logistique & Chambres' },
  { key: 'repas', label: 'Repas & Boissons' },
];

export const UPCOMING_FEATURES: UpcomingFeature[] = [
  {
    id: 'livret-jeux-enfants',
    order: 1,
    title: 'Livret de jeux pour enfants',
    category: 'Animation des invités',
    categoryKey: 'animation',
    badge: 'Bientôt disponible',
    description:
      'Génération d’un livret de jeux personnalisé (4 ou 8 pages de coloriages, labyrinthes et mots croisés sur le thème du mariage) calculé selon le nombre d’enfants confirmés.',
    keyBenefit: 'Calcul automatique du nombre d’exemplaires et personnalisation au prénom de chaque enfant (tranche 3-10 ans).',
    formatOrDeliverable: 'PDF haute définition prêt à imprimer',
    iconName: 'Gamepad2',
  },
  {
    id: 'ceremonie-laique',
    order: 2,
    title: 'Cérémonie laïque & Vœux secrets',
    category: 'Cérémonie',
    categoryKey: 'ceremonie',
    badge: 'Bientôt disponible',
    description:
      'Construction du déroulé pas à pas (trame en 10 moments clés), choix des rituels et coffre-fort secret pour la rédaction des vœux de chacun des mariés.',
    keyBenefit: 'Vos vœux restent masqués à votre partenaire tout en permettant à l’officiant ou au wedding planner d’en valider la durée et l’harmonie.',
    formatOrDeliverable: 'Livret des vœux + fiche régie son & officiant',
    iconName: 'HeartHandshake',
  },
  {
    id: 'livret-de-messe',
    order: 3,
    title: 'Livret de messe & Liturgie',
    category: 'Cérémonie',
    categoryKey: 'ceremonie',
    badge: 'Bientôt disponible',
    description:
      'Sélection assistée des lectures, prières et chants dans une bibliothèque liturgique officielle, avec mise en page automatique et ordre de pliage optimisé.',
    keyBenefit: 'Mise en page A5 ordonnée prête pour votre imprimeur et fiches de lecture séparées en gros caractères pour vos proches.',
    formatOrDeliverable: 'Livret A5 ordonné + fiches pupitre',
    iconName: 'Church',
  },
  {
    id: 'lune-de-miel',
    order: 4,
    title: 'Organisation de la lune de miel',
    category: 'Voyage',
    categoryKey: 'voyage',
    badge: 'Bientôt disponible',
    description:
      'Centralisation de votre itinéraire de voyage de noces (vols, hôtels, activités romantiques), suivi du budget transport et carnet de bord déconnecté.',
    keyBenefit: 'Tous vos billets, vouchers, adresses et numéros d’urgence accessibles au même endroit sur votre smartphone.',
    formatOrDeliverable: 'Carnet de route PDF & accès mobile hors-ligne',
    iconName: 'Compass',
  },
  {
    id: 'dossier-civil-mairie',
    order: 5,
    title: 'Dossier de mariage civil',
    category: 'Démarches administratives',
    categoryKey: 'demarches',
    badge: 'Bientôt disponible',
    description:
      'Checklist intelligente des pièces requises par la mairie, calcul de la fenêtre de validité des actes de naissance (< 3 mois) et lien de collecte sécurisé pour les témoins.',
    keyBenefit: 'Déverrouillage des démarches au bon moment (J-85) pour éviter la péremption légale de vos actes d’état civil.',
    formatOrDeliverable: 'Dossier administratif pré-rempli & suivi des témoins',
    iconName: 'Landmark',
  },
  {
    id: 'faire-part-save-the-date',
    order: 6,
    title: 'Faire-part et save-the-date',
    category: 'Papeterie & Invitation',
    categoryKey: 'papeterie',
    badge: 'Bientôt disponible',
    description:
      'Génération d’annonces cohérentes avec date, lieu et horaires de votre union, accompagnées d’un QR Code vectoriel unique renvoyant directement vers votre formulaire RSVP.',
    keyBenefit: 'QR Code pré-identifié pour chaque foyer afin de pré-remplir automatiquement le formulaire des invités au scan.',
    formatOrDeliverable: 'Fichiers vectoriels SVG / PNG HD pour votre imprimeur',
    iconName: 'MailCheck',
  },
  {
    id: 'hebergement-transport',
    order: 7,
    title: 'Hébergement et transport des invités',
    category: 'Logistique & Accueil',
    categoryKey: 'logistique',
    badge: 'Bientôt disponible',
    description:
      'Répartition des familles et des proches dans les gîtes du domaine ou hôtels partenaires, planification des rotations de navettes et suivi des paiements hébergement.',
    keyBenefit: 'Envoi d’une fiche logistique personnalisée par invité (chambre, digicode, horaires de navette) sans exposer les données des autres.',
    formatOrDeliverable: 'Fiche d’accueil par foyer & planning des chauffeurs',
    iconName: 'Bed',
  },
  {
    id: 'calculateur-boissons',
    order: 8,
    title: 'Calculateur de boissons & Droit de bouchon',
    category: 'Repas & Logistique',
    categoryKey: 'repas',
    badge: 'Bientôt disponible',
    description:
      'Estimation des quantités de champagne, vins et boissons sans alcool réparties par phase (cocktail, dîner assis, soirée dansante) selon le profil des convives.',
    keyBenefit: 'Comparateur de rentabilité entre forfait traiteur et achat direct chez le vigneron avec calcul du droit de bouchon.',
    formatOrDeliverable: 'Bon d’approvisionnement caviste / domaine',
    iconName: 'Wine',
  },
];

