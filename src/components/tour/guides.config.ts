/**
 * Configuration centralisée des guides interactifs par page
 * 
 * Structure:
 * - Chaque clé correspond à un identifiant de page unique
 * - Chaque guide contient un tableau d'étapes avec target, titre, description et position
 * - La position peut être: 'top' | 'bottom' | 'left' | 'right' | 'auto'
 * 
 * Pour ajouter un nouveau guide:
 * 1. Créer une nouvelle entrée dans PAGE_GUIDES
 * 2. Définir les étapes avec des sélecteurs CSS uniques
 * 3. Utiliser l'identifiant dans le composant de la page
 */

export interface GuideStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Si true, le guide attend que l'utilisateur interagisse avec l'élément avant de continuer */
  waitForInteraction?: boolean;
  /** Délai avant de passer à l'étape suivante (ms) - utile pour les animations */
  delay?: number;
}

/** Alias pour compatibilité */
export type TourStep = GuideStep;

export interface PageGuide {
  id: string;
  name: string;
  description: string;
  steps: GuideStep[];
  /** Version du guide pour invalidation du cache */
  version: string;
  /** Afficher automatiquement au premier chargement */
  autoStart?: boolean;
  /** Délai avant l'auto-démarrage (ms) */
  autoStartDelay?: number;
}

/** 
 * GUIDES PAR PAGE - Espace Client
 */
export const CLIENT_GUIDES: Record<string, PageGuide> = {
  // Dashboard principal
  dashboard: {
    id: 'dashboard',
    name: 'Tableau de bord',
    description: 'Guide de découverte du tableau de bord client',
    version: '1.0.0',
    autoStart: true,
    autoStartDelay: 1500,
    steps: [
      {
        id: 'welcome',
        target: '[data-tour="dashboard"]',
        title: 'Bienvenue sur votre tableau de bord',
        description: 'Ceci est votre centre de commande pour organiser votre mariage. Retrouvez ici toutes les informations essentielles en un coup d\'œil.',
        position: 'right',
      },
      {
        id: 'countdown',
        target: '[data-tour="countdown"]',
        title: 'Compte à rebours',
        description: 'Visualisez le temps restant avant le grand jour. Chaque jour compte !',
        position: 'bottom',
      },
      {
        id: 'quick-actions',
        target: '[data-tour="quick-actions"]',
        title: 'Actions rapides',
        description: 'Accédez rapidement aux fonctionnalités les plus utilisées : ajouter un rendez-vous, contacter un prestataire, etc.',
        position: 'left',
      },
      {
        id: 'vendors',
        target: '[data-tour="vendors"]',
        title: 'Vos prestataires',
        description: 'Retrouvez tous vos prestataires réservés et leur statut. Cliquez pour voir les détails.',
        position: 'top',
      },
      {
        id: 'progress',
        target: '[data-tour="progress"]',
        title: 'Votre progression',
        description: 'Suivez l\'avancement de vos préparatifs avec la checklist interactive.',
        position: 'left',
      },
    ],
  },

  // Page Planning
  planning: {
    id: 'planning',
    name: 'Planning',
    description: 'Guide de la page planning et rendez-vous',
    version: '1.0.0',
    autoStart: false,
    steps: [
      {
        id: 'calendar',
        target: '[data-tour="calendar"]',
        title: 'Votre calendrier',
        description: 'Visualisez tous vos rendez-vous et échéances importantes. Les jours avec événements sont mis en évidence.',
        position: 'right',
      },
      {
        id: 'add-appointment',
        target: '[data-tour="add-appointment"]',
        title: 'Ajouter un rendez-vous',
        description: 'Cliquez ici pour planifier un nouveau rendez-vous avec un prestataire ou une visite.',
        position: 'bottom',
      },
      {
        id: 'upcoming',
        target: '[data-tour="upcoming"]',
        title: 'Prochains rendez-vous',
        description: 'Retrouvez la liste de vos rendez-vous à venir, triés par date. Cliquez pour voir les détails.',
        position: 'left',
      },
      {
        id: 'milestones',
        target: '[data-tour="milestones"]',
        title: 'Étapes clés',
        description: 'Suivez vos jalons importants : réservation du lieu, choix du traiteur, envoi des invitations...',
        position: 'top',
      },
    ],
  },

  // Page Prestataires
  prestataires: {
    id: 'prestataires',
    name: 'Prestataires',
    description: 'Guide de la page prestataires',
    version: '1.0.0',
    autoStart: false,
    steps: [
      {
        id: 'search',
        target: '[data-tour="search"]',
        title: 'Recherche intelligente',
        description: 'Recherchez par nom, catégorie ou localisation. Notre algorithme vous suggère les meilleurs prestataires.',
        position: 'bottom',
      },
      {
        id: 'filters',
        target: '[data-tour="filters"]',
        title: 'Filtres avancés',
        description: 'Affinez votre recherche par prix, disponibilité, notes et avis des clients.',
        position: 'right',
      },
      {
        id: 'favorites',
        target: '[data-tour="favorites"]',
        title: 'Vos favoris',
        description: 'Retrouvez les prestataires que vous avez sauvegardés pour les comparer plus tard.',
        position: 'left',
      },
      {
        id: 'contact',
        target: '[data-tour="contact"]',
        title: 'Contacter un prestataire',
        description: 'Cliquez sur ce bouton pour envoyer un message direct au prestataire. Réponse garantie sous 48h.',
        position: 'top',
        waitForInteraction: true,
      },
    ],
  },

  // Page Mariage (infos)
  mariage: {
    id: 'mariage',
    name: 'Mon mariage',
    description: 'Guide de la page informations du mariage',
    version: '1.0.0',
    autoStart: false,
    steps: [
      {
        id: 'info-card',
        target: '[data-tour="info-card"]',
        title: 'Informations du mariage',
        description: 'Modifiez les détails essentiels : date, lieu, nombre d\'invités, thème...',
        position: 'right',
      },
      {
        id: 'edit-info',
        target: '[data-tour="edit-info"]',
        title: 'Modifier les infos',
        description: 'Cliquez ici pour mettre à jour les informations de votre mariage.',
        position: 'bottom',
      },
      {
        id: 'theme',
        target: '[data-tour="theme"]',
        title: 'Votre thème',
        description: 'Définissez le style et les couleurs de votre mariage. Les prestataires verront ces informations.',
        position: 'left',
      },
    ],
  },

  // Page Messages
  messages: {
    id: 'messages',
    name: 'Messagerie',
    description: 'Guide de la messagerie',
    version: '1.0.0',
    autoStart: false,
    steps: [
      {
        id: 'conversation-list',
        target: '[data-tour="conversation-list"]',
        title: 'Vos conversations',
        description: 'Retrouvez toutes vos discussions avec les prestataires. Les messages non lus sont indiqués.',
        position: 'right',
      },
      {
        id: 'new-message',
        target: '[data-tour="new-message"]',
        title: 'Nouveau message',
        description: 'Démarrez une conversation avec un nouveau prestataire.',
        position: 'bottom',
      },
      {
        id: 'attachments',
        target: '[data-tour="attachments"]',
        title: 'Joindre des fichiers',
        description: 'Partagez des photos, devis, contrats ou tout document utile pour votre organisation.',
        position: 'top',
      },
    ],
  },
};

/**
 * GUIDES PAR PAGE - Espace Prestataire
 */
export const PRESTATAIRE_GUIDES: Record<string, PageGuide> = {
  dashboard: {
    id: 'prestataire-dashboard',
    name: 'Tableau de bord',
    description: 'Guide du tableau de bord prestataire',
    version: '1.0.0',
    autoStart: true,
    autoStartDelay: 1500,
    steps: [
      {
        id: 'stats',
        target: '[data-tour="stats"]',
        title: 'Vos statistiques',
        description: 'Suivez les vues de votre profil, les demandes de contact et les messages reçus.',
        position: 'bottom',
      },
      {
        id: 'leads',
        target: '[data-tour="leads"]',
        title: 'Nouvelles demandes',
        description: 'Retrouvez ici les couples intéressés par vos services. Répondez rapidement pour maximiser vos conversions.',
        position: 'left',
      },
      {
        id: 'announcement',
        target: '[data-tour="announcement"]',
        title: 'Votre annonce',
        description: 'Mettez à jour vos photos, description et tarifs pour attirer plus de clients.',
        position: 'top',
      },
    ],
  },
};

/**
 * GUIDES PAR PAGE - Pages publiques
 */
export const PUBLIC_GUIDES: Record<string, PageGuide> = {
  home: {
    id: 'home',
    name: 'Accueil',
    description: 'Guide de la page d\'accueil',
    version: '1.0.0',
    autoStart: false,
    steps: [
      {
        id: 'search',
        target: '[data-tour="search"]',
        title: 'Recherche par ville',
        description: 'Entrez votre ville ou région pour découvrir les prestataires près de chez vous.',
        position: 'bottom',
      },
      {
        id: 'categories',
        target: '[data-tour="categories"]',
        title: 'Catégories',
        description: 'Explorez les différentes catégories de prestataires : lieux, traiteurs, photographes...',
        position: 'right',
      },
      {
        id: 'signup',
        target: '[data-tour="signup"]',
        title: 'Créer un compte',
        description: 'Inscrivez-vous gratuitement pour accéder à toutes les fonctionnalités.',
        position: 'left',
      },
    ],
  },
};

/**
 * Récupérer un guide par son ID
 */
export function getGuide(guideId: string, type: 'client' | 'prestataire' | 'public' = 'client'): PageGuide | null {
  const guides = type === 'client' ? CLIENT_GUIDES : type === 'prestataire' ? PRESTATAIRE_GUIDES : PUBLIC_GUIDES;
  return guides[guideId] || null;
}

/**
 * Liste tous les guides disponibles
 */
export function listGuides(type: 'client' | 'prestataire' | 'public' = 'client'): PageGuide[] {
  const guides = type === 'client' ? CLIENT_GUIDES : type === 'prestataire' ? PRESTATAIRE_GUIDES : PUBLIC_GUIDES;
  return Object.values(guides);
}

/**
 * Vérifier si un guide existe
 */
export function hasGuide(guideId: string, type: 'client' | 'prestataire' | 'public' = 'client'): boolean {
  const guides = type === 'client' ? CLIENT_GUIDES : type === 'prestataire' ? PRESTATAIRE_GUIDES : PUBLIC_GUIDES;
  return guideId in guides;
}
