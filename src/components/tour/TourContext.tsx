'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { PageGuide, GuideStep } from './guides.config';

/**
 * États possibles du tour
 */
type TourStatus = 'idle' | 'active' | 'paused' | 'completed' | 'loading';

/**
 * Configuration des callbacks
 */
interface TourCallbacks {
  onStepChange?: (stepIndex: number, step: GuideStep) => void;
  onTourStart?: (guide: PageGuide) => void;
  onTourComplete?: (guide: PageGuide) => void;
  onTourStop?: (guide: PageGuide, stepIndex: number) => void;
}

/**
 * Interface du contexte
 */
interface TourContextType {
  // État actuel
  currentGuide: PageGuide | null;
  currentStepIndex: number;
  status: TourStatus;
  isLoading: boolean;
  
  // Getters
  currentStep: GuideStep | null;
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number;
  
  // Actions
  startTour: (guide: PageGuide, callbacks?: TourCallbacks) => void;
  stopTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  nextStep: () => Promise<boolean>;
  prevStep: () => void;
  goToStep: (index: number) => Promise<boolean>;
  skipStep: () => void;
  
  // Vérifications
  hasCompletedTour: (guideId: string) => boolean;
  markTourAsCompleted: (guideId: string) => void;
  resetTourStatus: (guideId: string) => void;
  
  // Validation
  validateStepTarget: (targetSelector: string) => boolean;
  waitForStepReady: (targetSelector: string, timeout?: number) => Promise<boolean>;
}

// Création du contexte avec une valeur par défaut undefined
const TourContext = createContext<TourContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'leoui_tour_';

export function TourProvider({ children }: { children: ReactNode }) {
  const [currentGuide, setCurrentGuide] = useState<PageGuide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<TourStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const callbacksRef = useRef<TourCallbacks>({});

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
   * Démarrer un tour avec callbacks optionnels
   */
  const startTour = useCallback((guide: PageGuide, callbacks?: TourCallbacks) => {
    // Vérifier si déjà complété
    if (hasCompletedTourInStorage(guide.id)) {
      console.log(`[Tour] Guide "${guide.id}" déjà complété, ignoré`);
      return;
    }
    
    // Store callbacks
    callbacksRef.current = callbacks || {};
    
    setCurrentGuide(guide);
    setCurrentStepIndex(0);
    setStatus('active');
    setIsLoading(false);
    
    console.log(`[Tour] Démarrage du guide "${guide.id}" - ${guide.steps.length} étapes`);
    
    // Trigger callback
    callbacksRef.current.onTourStart?.(guide);
  }, []);

  /**
   * Arrêter le tour
   */
  const stopTour = useCallback(() => {
    const guide = currentGuide;
    const stepIndex = currentStepIndex;
    
    setStatus('idle');
    setCurrentStepIndex(0);
    setIsLoading(false);
    
    console.log('[Tour] Tour arrêté');
    
    // Trigger callback
    if (guide) {
      callbacksRef.current.onTourStop?.(guide, stepIndex);
    }
  }, [currentGuide, currentStepIndex]);

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
   * Étape suivante - avec validation async
   * Retourne true si l'étape a changé, false sinon
   */
  const nextStep = useCallback(async (): Promise<boolean> => {
    if (!currentGuide) return false;
    
    if (isLastStep) {
      // Tour terminé
      markTourAsCompletedInStorage(currentGuide.id);
      setStatus('completed');
      setIsLoading(false);
      console.log(`[Tour] Guide "${currentGuide.id}" complété!`);
      
      // Trigger callback
      callbacksRef.current.onTourComplete?.(currentGuide);
      return false;
    }
    
    const nextIndex = currentStepIndex + 1;
    const nextStep = currentGuide.steps[nextIndex];
    
    // Validate next step has a target if specified
    if (nextStep?.target) {
      setIsLoading(true);
      const isReady = await waitForStepReadyAsync(nextStep.target, 3000);
      setIsLoading(false);
      
      if (!isReady) {
        console.warn(`[Tour] Étape ${nextIndex + 1}: cible "${nextStep.target}" non trouvée, skip`);
        // Skip to next step
        setCurrentStepIndex(prev => Math.min(prev + 1, currentGuide.steps.length - 1));
        return true;
      }
    }
    
    setCurrentStepIndex(nextIndex);
    
    // Trigger callback
    callbacksRef.current.onStepChange?.(nextIndex, nextStep);
    
    return true;
  }, [currentGuide, currentStepIndex, isLastStep]);

  /**
   * Étape précédente
   */
  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev: number) => Math.max(0, prev - 1));
  }, []);

  /**
   * Aller à une étape spécifique - avec validation
   */
  const goToStep = useCallback(async (index: number): Promise<boolean> => {
    if (!currentGuide || index < 0 || index >= currentGuide.steps.length) {
      return false;
    }
    
    const step = currentGuide.steps[index];
    
    // Validate step has a target if specified
    if (step?.target) {
      setIsLoading(true);
      const isReady = await waitForStepReadyAsync(step.target, 3000);
      setIsLoading(false);
      
      if (!isReady) {
        console.warn(`[Tour] Étape ${index + 1}: cible "${step.target}" non trouvée`);
        return false;
      }
    }
    
    setCurrentStepIndex(index);
    
    // Trigger callback
    callbacksRef.current.onStepChange?.(index, step);
    
    return true;
  }, [currentGuide]);

  /**
   * Skip l'étape courante
   */
  const skipStep = useCallback(() => {
    if (!currentGuide) return;
    
    if (isLastStep) {
      stopTour();
    } else {
      setCurrentStepIndex(prev => Math.min(prev + 1, currentGuide.steps.length - 1));
    }
  }, [currentGuide, isLastStep, stopTour]);

  /**
   * Valider que le target d'une étape existe
   */
  const validateStepTarget = useCallback((targetSelector: string): boolean => {
    if (!targetSelector) return true;
    return !!document.querySelector(targetSelector);
  }, []);

  /**
   * Attendre qu'une étape soit prête (élément dans le DOM)
   */
  const waitForStepReadyAsync = async (targetSelector: string, timeout: number = 3000): Promise<boolean> => {
    if (!targetSelector) return true;
    
    // Check immediately
    if (document.querySelector(targetSelector)) {
      return true;
    }
    
    // Wait with timeout
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (document.querySelector(targetSelector)) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  };

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
    isLoading,
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
    skipStep,
    hasCompletedTour,
    markTourAsCompleted,
    resetTourStatus,
    validateStepTarget,
    waitForStepReady: waitForStepReadyAsync,
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
