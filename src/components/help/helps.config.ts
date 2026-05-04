/**
 * Configuration des aides par page
 * 
 * Design: Simple, direct, non intrusif
 * Chaque aide = 1 message court + 1 élément cible
 */
import type { PageHelps, SimpleHelp } from './types';

/** Aides pour l'espace client */
export const CLIENT_HELPS: Record<string, PageHelps> = {
  dashboard: {
    pageId: 'client-dashboard',
    helps: [
      {
        id: 'dashboard-planning',
        target: '[data-help="planning"]',
        message: '📅 Accède à ton planning de mariage ici',
        position: 'bottom',
        autoCloseDelay: 5000,
      },
      {
        id: 'dashboard-prestataires',
        target: '[data-help="prestataires"]',
        message: '💍 Gère tes prestataires préférés',
        position: 'bottom',
        autoCloseDelay: 5000,
      },
      {
        id: 'dashboard-budget',
        target: '[data-help="budget"]',
        message: '💰 Suis ton budget en temps réel',
        position: 'left',
        autoCloseDelay: 5000,
      },
    ],
    autoShowOnFirstVisit: true,
    autoShowDelay: 1500,
  },

  planning: {
    pageId: 'client-planning',
    helps: [
      {
        id: 'planning-add-event',
        target: '[data-help="add-event"]',
        message: '➕ Ajoute un événement à ton calendrier',
        position: 'left',
      },
      {
        id: 'planning-timeline',
        target: '[data-help="timeline"]',
        message: '📆 Visualise ta timeline complète',
        position: 'right',
      },
    ],
    autoShowOnFirstVisit: true,
    autoShowDelay: 1000,
  },

  prestataires: {
    pageId: 'client-prestataires',
    helps: [
      {
        id: 'prestataires-search',
        target: '[data-help="search"]',
        message: '🔍 Recherche par catégorie ou localisation',
        position: 'bottom',
      },
      {
        id: 'prestataires-contact',
        target: '[data-help="contact"]',
        message: '📨 Contacte directement ce prestataire',
        position: 'top',
      },
    ],
    autoShowOnFirstVisit: true,
    autoShowDelay: 1000,
  },
};

/** Aides pour l'espace prestataire */
export const VENDOR_HELPS: Record<string, PageHelps> = {
  dashboard: {
    pageId: 'vendor-dashboard',
    helps: [
      {
        id: 'vendor-profile',
        target: '[data-help="profile"]',
        message: '📝 Complète ton profil pour plus de visibilité',
        position: 'bottom',
        autoCloseDelay: 6000,
      },
      {
        id: 'vendor-leads',
        target: '[data-help="leads"]',
        message: '👋 Consulte tes nouvelles demandes',
        position: 'bottom',
        autoCloseDelay: 5000,
      },
      {
        id: 'vendor-messages',
        target: '[data-help="messages"]',
        message: '💬 Réponds rapidement aux messages',
        position: 'left',
        autoCloseDelay: 5000,
      },
    ],
    autoShowOnFirstVisit: true,
    autoShowDelay: 1500,
  },

  abonnement: {
    pageId: 'vendor-subscription',
    helps: [
      {
        id: 'sub-upgrade',
        target: '[data-help="upgrade"]',
        message: '⭐ Passe à la formule Pro pour plus de visibilité',
        position: 'top',
      },
      {
        id: 'sub-manage',
        target: '[data-help="manage"]',
        message: '⚙️ Gère ton abonnement ici',
        position: 'bottom',
      },
    ],
    autoShowOnFirstVisit: false,
  },
};

/** Aides générales (applicables partout) */
export const COMMON_HELPS: SimpleHelp[] = [
  {
    id: 'help-button',
    target: '[data-help="help-button"]',
    message: '💡 Clique ici quand tu as besoin d\'aide',
    position: 'left',
  },
];

/**
 * Récupère la configuration d'aide pour une page
 */
export function getPageHelps(
  pageId: string, 
  userType: 'client' | 'vendor' | 'public'
): PageHelps | undefined {
  if (userType === 'client') {
    return CLIENT_HELPS[pageId];
  }
  if (userType === 'vendor') {
    return VENDOR_HELPS[pageId];
  }
  return undefined;
}

export default { CLIENT_HELPS, VENDOR_HELPS, COMMON_HELPS, getPageHelps };
