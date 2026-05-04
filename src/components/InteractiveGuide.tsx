'use client';

/**
 * InteractiveGuide - Système de guides multi-pages
 * 
 * Ce composant utilise la nouvelle architecture avec:
 * - TourProvider (contexte global)
 * - usePageTour (détection automatique des pages)
 * - TourManager (orchestration)
 * 
 * À placer dans le layout principal avec TourManager
 */

import React from 'react';
import { TourProvider } from './tour/TourContext';
import TourManager from './tour/TourManager';

interface InteractiveGuideProps {
  children: React.ReactNode;
}

/**
 * Wrapper avec TourProvider
 * À utiliser dans le layout racine pour envelopper toute l'application
 */
export function InteractiveGuideProvider({ children }: InteractiveGuideProps) {
  return (
    <TourProvider>
      <TourManager />
      {children}
    </TourProvider>
  );
}

/**
 * @deprecated Utiliser TourManager + usePageTour directement
 * Ce composant est gardé pour compatibilité mais redirige vers la nouvelle architecture
 */
export default function InteractiveGuide() {
  // Le TourManager gère déjà tout, ce composant est vide
  return null;
}

// Ré-exports pour compatibilité - utiliser des imports directs
export { usePageTour } from './tour/usePageTour';
export { useTourContext } from './tour/TourContext';
export { default as TourManager } from './tour/TourManager';
export type { GuideStep, PageGuide, TourStep } from './tour/guides.config';
