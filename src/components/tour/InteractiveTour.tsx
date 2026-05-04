'use client';

import React from 'react';
import TourOverlay from './TourOverlay';
import TourTooltip from './TourTooltip';
import { TourStep } from './guides.config';

interface InteractiveTourProps {
  steps: TourStep[];
  isActive: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function InteractiveTour({
  steps,
  isActive,
  currentStep,
  onNext,
  onPrev,
  onClose,
  isFirstStep,
  isLastStep,
}: InteractiveTourProps) {
  const currentStepData = steps[currentStep];
  const hasTarget = !!currentStepData?.target;

  return (
    <>
      {/* Overlay with spotlight effect */}
      <TourOverlay
        targetSelector={hasTarget ? currentStepData.target : null}
        isActive={isActive}
        onClick={onClose}
        padding={12}
        borderRadius={16}
      />

      {/* Tooltip for current step */}
      {isActive && currentStepData && (
        <TourTooltip
          targetSelector={currentStepData.target}
          isVisible={isActive}
          title={currentStepData.title}
          description={currentStepData.description}
          stepNumber={currentStep + 1}
          totalSteps={steps.length}
          position={currentStepData.position || 'auto'}
          onNext={onNext}
          onPrev={onPrev}
          onClose={onClose}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
        />
      )}

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
        
        /* Ensure highlighted elements are interactive */}
        [data-tour-highlight] {
          position: relative;
          z-index: 101;
        }
      `}</style>
    </>
  );
}
