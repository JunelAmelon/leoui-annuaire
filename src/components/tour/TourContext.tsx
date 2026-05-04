'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PageGuide, GuideStep } from './guides.config';

/**
 * États possibles du tour
 */
type TourStatus = 'idle' | 'active' | 'paused' | 'completed';

/**
 * Interface du contexte
 */
interface TourContextType {
  // État actuel
  currentGuide: PageGuide | null;
  currentStepIndex: number;
  status: TourStatus;
  
  // Getters
  currentStep: GuideStep | null;
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number;
  
  // Actions
  startTour: (guide: PageGuide) => void;
  stopTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  
  // Vérifications
  hasCompletedTour: (guideId: string) => boolean;
  markTourAsCompleted: (guideId: string) => void;
  resetTourStatus: (guideId: string) => void;
}

// Création du contexte avec une valeur par défaut undefined
const TourContext = createContext<TourContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'leoui_tour_';

export function TourProvider({ children }: { children: ReactNode }) {
  const [currentGuide, setCurrentGuide] = useState<PageGuide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<TourStatus>('idle');

  /**
   * Getters dérivés
   */
  const currentStep = currentGuide?.steps[currentStepIndex] || null;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentGuide ? currentStepIndex === currentGuide.steps.length - 1 : false;
  const progress = currentGuide && currentGuide.steps.length > 0
    ? ((currentStepIndex + 1) / currentGuide.steps.length) * 100
    : 0;

  /**
   * Démarrer un tour
   */
  const startTour = useCallback((guide: PageGuide) => {
    // Vérifier si déjà complété
    if (hasCompletedTourInStorage(guide.id)) {
      console.log(`[Tour] Guide "${guide.id}" déjà complété, ignoré`);
      return;
    }
    
    setCurrentGuide(guide);
    setCurrentStepIndex(0);
    setStatus('active');
    console.log(`[Tour] Démarrage du guide "${guide.id}" - ${guide.steps.length} étapes`);
  }, []);

  /**
   * Arrêter le tour
   */
  const stopTour = useCallback(() => {
    setStatus('idle');
    setCurrentStepIndex(0);
    // Note: on garde currentGuide pour référence jusqu'au prochain start
    console.log('[Tour] Tour arrêté');
  }, []);

  /**
   * Mettre en pause
   */
  const pauseTour = useCallback(() => {
    setStatus('paused');
    console.log('[Tour] Tour mis en pause');
  }, []);

  /**
   * Reprendre
   */
  const resumeTour = useCallback(() => {
    if (currentGuide && status === 'paused') {
      setStatus('active');
      console.log('[Tour] Tour repris');
    }
  }, [currentGuide, status]);

  /**
   * Étape suivante
   */
  const nextStep = useCallback(() => {
    if (!currentGuide) return;
    
    if (isLastStep) {
      // Tour terminé
      markTourAsCompletedInStorage(currentGuide.id);
      setStatus('completed');
      console.log(`[Tour] Guide "${currentGuide.id}" complété!`);
    } else {
      setCurrentStepIndex(prev => Math.min(prev + 1, currentGuide.steps.length - 1));
    }
  }, [currentGuide, isLastStep]);

  /**
   * Étape précédente
   */
  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev: number) => Math.max(0, prev - 1));
  }, []);

  /**
   * Aller à une étape spécifique
   */
  const goToStep = useCallback((index: number) => {
    if (currentGuide && index >= 0 && index < currentGuide.steps.length) {
      setCurrentStepIndex(index);
    }
  }, [currentGuide]);

  /**
   * Vérifier si un tour a été complété
   */
  const hasCompletedTour = useCallback((guideId: string): boolean => {
    return hasCompletedTourInStorage(guideId);
  }, []);

  /**
   * Marquer un tour comme complété
   */
  const markTourAsCompleted = useCallback((guideId: string) => {
    markTourAsCompletedInStorage(guideId);
  }, []);

  /**
   * Réinitialiser le statut d'un tour
   */
  const resetTourStatus = useCallback((guideId: string) => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${guideId}_completed`);
      console.log(`[Tour] Statut du guide "${guideId}" réinitialisé`);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  /**
   * Keyboard navigation
   */
  useEffect(() => {
    if (status !== 'active') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          stopTour();
          break;
        case 'ArrowRight':
          nextStep();
          break;
        case 'ArrowLeft':
          prevStep();
          break;
        case ' ':
          // Espace pour pause/play
          e.preventDefault();
          if (status === 'active') pauseTour();
          else resumeTour();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [status, stopTour, nextStep, prevStep, pauseTour, resumeTour]);

  const value: TourContextType = {
    currentGuide,
    currentStepIndex,
    status,
    currentStep,
    isFirstStep,
    isLastStep,
    progress,
    startTour,
    stopTour,
    pauseTour,
    resumeTour,
    nextStep,
    prevStep,
    goToStep,
    hasCompletedTour,
    markTourAsCompleted,
    resetTourStatus,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte
 */
export function useTourContext() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
}

/**
 * Helpers pour localStorage
 */
function hasCompletedTourInStorage(guideId: string): boolean {
  try {
    const value = localStorage.getItem(`${STORAGE_KEY_PREFIX}${guideId}_completed`);
    return value === 'true';
  } catch {
    return false;
  }
}

function markTourAsCompletedInStorage(guideId: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${guideId}_completed`, 'true');
  } catch {
    // Ignore localStorage errors
  }
}
