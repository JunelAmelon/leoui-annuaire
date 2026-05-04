/**
 * Types pour le système d'aide simplifié
 * Design: simple, moderne, non intrusif
 */

/** Position de l'infobulle */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';

/** Une aide simple (une seule étape) */
export interface SimpleHelp {
  /** ID unique de l'aide */
  id: string;
  /** Sélecteur CSS de l'élément cible */
  target: string;
  /** Texte court et direct (max 2 lignes) */
  message: string;
  /** Position de l'infobulle */
  position?: TooltipPosition;
  /** Délai avant disparition auto (ms), 0 = pas de disparition auto */
  autoCloseDelay?: number;
  /** Emojis ou icônes optionnelles */
  icon?: string;
}

/** Configuration des aides pour une page */
export interface PageHelps {
  /** ID de la page */
  pageId: string;
  /** Liste des aides */
  helps: SimpleHelp[];
  /** Afficher automatiquement au premier passage */
  autoShowOnFirstVisit?: boolean;
  /** Délai avant auto-affichage (ms) */
  autoShowDelay?: number;
}

/** État du système d'aide */
export interface HelpState {
  /** Active ou non */
  isActive: boolean;
  /** Aide actuellement affichée */
  currentHelpId: string | null;
  /** Toutes les aides visibles */
  visibleHelpIds: string[];
  /** Déjà vu (localStorage) */
  seenHelpIds: string[];
}

/** Props du composant SimpleHelpProvider */
export interface SimpleHelpProviderProps {
  children: React.ReactNode;
  /** Configuration des aides par page */
  pageHelps?: PageHelps;
  /** Désactiver globalement */
  disabled?: boolean;
}

/** Props du composant HelpTooltip */
export interface HelpTooltipProps {
  help: SimpleHelp;
  isVisible: boolean;
  onClose: () => void;
  /** Variante visuelle */
  variant?: 'light' | 'dark' | 'gold';
}

/** Props du composant HelpButton */
export interface HelpButtonProps {
  /** Position du bouton */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Taille */
  size?: 'sm' | 'md' | 'lg';
  /** Variante */
  variant?: 'default' | 'ghost' | 'gold';
  /** Texte du tooltip du bouton */
  tooltipText?: string;
  /** Callback au clic */
  onClick?: () => void;
  /** État actif/inactif */
  isActive?: boolean;
}
