'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTourContext } from './TourContext';
import { PageGuide, getGuide } from './guides.config';

type UserType = 'client' | 'prestataire' | 'public';

interface UsePageTourOptions {
  /** Mapping des routes vers les IDs de guides */
  routeMapping: Record<string, string>;
  /** Type d'utilisateur pour charger les bons guides */
  userType?: UserType;
  /** Désactiver l'auto-démarrage même si le guide le demande */
  disableAutoStart?: boolean;
  /** Callback quand un tour démarre */
  onTourStart?: (guide: PageGuide) => void;
  /** Callback quand un tour se termine */
  onTourComplete?: (guide: PageGuide) => void;
}

interface UsePageTourReturn {
  /** Démarrer manuellement le tour de la page courante */
  startCurrentPageTour: () => boolean;
  /** Vérifier si la page courante a un guide */
  hasGuideForCurrentPage: boolean;
  /** ID du guide de la page courante */
  currentGuideId: string | null;
}

/**
 * Hook pour gérer les tours par page avec détection automatique
 * 
 * Exemple d'utilisation:
 * 
 * ```tsx
 * const routeMapping = {
 *   '/espace-client': 'dashboard',
 *   '/espace-client/planning': 'planning',
 *   '/espace-client/prestataires': 'prestataires',
 * };
 * 
 * const { startCurrentPageTour, hasGuideForCurrentPage } = usePageTour({
 *   routeMapping,
 *   userType: 'client',
 * });
 * ```
 */
export function usePageTour({
  routeMapping,
  userType = 'client',
  disableAutoStart = false,
  onTourStart,
  onTourComplete,
}: UsePageTourOptions): UsePageTourReturn {
  const pathname = usePathname();
  const { startTour, status, currentGuide, markTourAsCompleted, hasCompletedTour } = useTourContext();
  
  // Ref pour éviter les démarrages multiples
  const hasAutoStarted = useRef<Record<string, boolean>>({});

  /**
   * Trouver l'ID du guide pour la route courante
   */
  const getGuideIdForPath = useCallback((path: string): string | null => {
    // Match exact d'abord
    if (routeMapping[path]) {
      return routeMapping[path];
    }
    
    // Ensuite match par préfixe (pour les sous-routes)
    // Trier par longueur décroissante pour matcher les plus spécifiques d'abord
    const sortedRoutes = Object.keys(routeMapping).sort((a, b) => b.length - a.length);
    
    for (const route of sortedRoutes) {
      if (path.startsWith(route)) {
        return routeMapping[route];
      }
    }
    
    return null;
  }, [routeMapping]);

  const currentGuideId = getGuideIdForPath(pathname);
  const hasGuideForCurrentPage = currentGuideId !== null;

  /**
   * Démarrer le tour de la page courante
   */
  const startCurrentPageTour = useCallback((): boolean => {
    if (!currentGuideId) {
      console.log(`[usePageTour] Aucun guide trouvé pour ${pathname}`);
      return false;
    }

    const guide = getGuide(currentGuideId, userType);
    
    if (!guide) {
      console.warn(`[usePageTour] Guide "${currentGuideId}" introuvable dans la config`);
      return false;
    }

    startTour(guide);
    onTourStart?.(guide);
    return true;
  }, [currentGuideId, pathname, userType, startTour, onTourStart]);

  /**
   * Auto-démarrage quand on change de page
   */
  useEffect(() => {
    if (disableAutoStart || !currentGuideId) return;

    const guide = getGuide(currentGuideId, userType);
    
    if (!guide) return;
    if (!guide.autoStart) return;
    
    // Vérifier si déjà auto-démarré pour cette session
    if (hasAutoStarted.current[currentGuideId]) return;
    
    // Vérifier si déjà complété (via localStorage pour persistance)
    if (hasCompletedTour(currentGuideId)) return;

    // Démarrer après le délai
    const delay = guide.autoStartDelay || 1500;
    const timer = setTimeout(() => {
      hasAutoStarted.current[currentGuideId] = true;
      startTour(guide);
      onTourStart?.(guide);
    }, delay);

    return () => clearTimeout(timer);
  }, [pathname, currentGuideId, userType, disableAutoStart, startTour, onTourStart]);

  /**
   * Détecter la fin du tour
   */
  useEffect(() => {
    if (status === 'completed' && currentGuide) {
      onTourComplete?.(currentGuide);
    }
  }, [status, currentGuide, onTourComplete]);

  return {
    startCurrentPageTour,
    hasGuideForCurrentPage,
    currentGuideId,
  };
}

/**
 * Hook simplifié pour vérifier si un élément existe dans le DOM
 * Utile pour le fallback et le debug
 */
export function useTourTarget(targetSelector: string | null): boolean {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!targetSelector) {
      setExists(false);
      return;
    }

    const checkTarget = () => {
      const element = document.querySelector(targetSelector);
      setExists(!!element);
    };

    checkTarget();

    // Recheck après un délai pour le contenu dynamique
    const timers = [100, 500, 1000].map(delay => 
      setTimeout(checkTarget, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [targetSelector]);

  return exists;
}

