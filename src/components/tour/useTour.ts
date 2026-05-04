'use client';

import { useState, useCallback, useEffect } from 'react';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

interface UseTourOptions {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  persistKey?: string;
}

interface UseTourReturn {
  currentStep: number;
  isActive: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  currentStepData: TourStep | null;
  start: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  goToStep: (index: number) => void;
  hasSeenTour: boolean;
  markAsSeen: () => void;
  resetTour: () => void;
}

export function useTour({
  steps,
  onComplete,
  onSkip,
  persistKey,
}: UseTourOptions): UseTourReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  // Check if user has seen the tour
  useEffect(() => {
    if (persistKey) {
      try {
        const seen = localStorage.getItem(`tour_${persistKey}_completed`);
        setHasSeenTour(seen === 'true');
      } catch {
        setHasSeenTour(false);
      }
    }
  }, [persistKey]);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = isActive && steps.length > 0 ? steps[currentStep] : null;

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    onSkip?.();
  }, [onSkip]);

  const next = useCallback(() => {
    if (isLastStep) {
      setIsActive(false);
      if (persistKey) {
        try {
          localStorage.setItem(`tour_${persistKey}_completed`, 'true');
          setHasSeenTour(true);
        } catch {}
      }
      onComplete?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete, persistKey]);

  const prev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < steps.length) {
      setCurrentStep(index);
    }
  }, [steps.length]);

  const markAsSeen = useCallback(() => {
    if (persistKey) {
      try {
        localStorage.setItem(`tour_${persistKey}_completed`, 'true');
        setHasSeenTour(true);
      } catch {}
    }
  }, [persistKey]);

  const resetTour = useCallback(() => {
    if (persistKey) {
      try {
        localStorage.removeItem(`tour_${persistKey}_completed`);
        setHasSeenTour(false);
      } catch {}
    }
    setCurrentStep(0);
    setIsActive(false);
  }, [persistKey]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          stop();
          break;
        case 'ArrowRight':
          next();
          break;
        case 'ArrowLeft':
          prev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, stop, next, prev]);

  return {
    currentStep,
    isActive,
    isFirstStep,
    isLastStep,
    currentStepData,
    start,
    stop,
    next,
    prev,
    goToStep,
    hasSeenTour,
    markAsSeen,
    resetTour,
  };
}
