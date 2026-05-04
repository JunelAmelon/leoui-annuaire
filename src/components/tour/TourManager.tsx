'use client';

import React, { useCallback, useEffect } from 'react';
import { useTourContext } from './TourContext';
import TourOverlay from './TourOverlay';
import TourTooltip from './TourTooltip';

/**
 * TourManager - Composant orchestrateur du système de tour
 * 
 * Ce composant doit être placé une seule fois dans l'application,
 * idéalement près de la racine (dans le layout principal).
 * 
 * Il gère :
 * - L'affichage de l'overlay avec spotlight
 * - L'affichage des tooltips
 * - Les animations globales
 * - La gestion des erreurs (éléments non trouvés)
 * 
 * Exemple:
 * ```tsx
 * <TourProvider>
 *   <TourManager />
 *   <YourApp />
 * </TourProvider>
 * ```
 */
export default function TourManager() {
  const {
    currentGuide,
    currentStep,
    currentStepIndex,
    status,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    stopTour,
  } = useTourContext();

  const isActive = status === 'active';
  const hasTarget = !!currentStep?.target;

  /**
   * Gestion de l'élément non trouvé - skip automatique
   */
  const handleTargetNotFound = useCallback(() => {
    if (!currentStep) return;
    
    console.warn(`[TourManager] Étape ${currentStepIndex + 1}: élément "${currentStep.target}" non trouvé, passage à l'étape suivante`);
    
    // Skip automatique vers l'étape suivante ou arrêt si dernière étape
    if (isLastStep) {
      stopTour();
    } else {
      nextStep();
    }
  }, [currentStep, currentStepIndex, isLastStep, nextStep, stopTour]);

  /**
   * Gestion du body scroll pendant le tour
   */
  useEffect(() => {
    if (isActive) {
      document.body.classList.add('tour-active');
    } else {
      document.body.classList.remove('tour-active');
    }
    
    return () => {
      document.body.classList.remove('tour-active');
    };
  }, [isActive]);

  // Ne rien afficher si pas de tour actif
  if (!isActive || !currentGuide) return null;

  return (
    <>
      {/* Overlay avec spotlight */}
      <TourOverlay
        targetSelector={hasTarget ? currentStep.target : null}
        isActive={isActive}
        onClick={stopTour}
        padding={12}
        borderRadius={16}
      />

      {/* Tooltip pour l'étape courante */}
      {currentStep && (
        <TourTooltip
          targetSelector={currentStep.target}
          isVisible={isActive}
          title={currentStep.title}
          description={currentStep.description}
          stepNumber={currentStepIndex + 1}
          totalSteps={currentGuide.steps.length}
          position={currentStep.position || 'auto'}
          onNext={nextStep}
          onPrev={prevStep}
          onClose={stopTour}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
          onTargetNotFound={handleTargetNotFound}
          maxWaitForTarget={3000}
        />
      )}

      {/* Styles globaux pour les animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        @keyframes pulse-stroke {
          0%, 100% {
            stroke-opacity: 0.6;
            stroke-width: 3;
          }
          50% {
            stroke-opacity: 1;
            stroke-width: 4;
          }
        }
        
        .animate-pulse-stroke {
          animation: pulse-stroke 2s ease-in-out infinite;
        }
        
        @keyframes tooltip-in {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-tooltip-in {
          animation: tooltip-in 0.3s ease-out;
        }
        
        /* Style pour les éléments en surbrillance */
        [data-tour-highlight] {
          position: relative;
          z-index: 101;
          pointer-events: auto !important;
        }
        
        /* Désactiver le scroll du body pendant le tour */
        body.tour-active {
          overflow: hidden;
        }
        
        /* Assurer que les éléments cliquables restent interactifs */
        .tour-spotlight-cutout {
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
