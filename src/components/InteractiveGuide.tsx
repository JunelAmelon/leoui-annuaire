'use client';

import React from 'react';
import { InteractiveTour, useTour, TourStep } from './tour';
import { LayoutDashboard, MapPin, Users, CalendarDays, MessageSquare } from 'lucide-react';

// Define the tour steps for the client dashboard
const CLIENT_DASHBOARD_STEPS: TourStep[] = [
  {
    id: 'dashboard',
    target: '[data-tour="dashboard"]',
    title: 'Votre tableau de bord',
    description: 'Retrouvez ici un aperçu complet de votre mariage : compte à rebours, prestataires réservés, budget, et prochaines étapes.',
    position: 'auto',
  },
  {
    id: 'venue',
    target: '[data-tour="venue"]',
    title: 'Choisissez votre lieu',
    description: 'Explorez notre réseau de lieux de réception vérifiés. Filtrez par région, capacité, et style pour trouver l\'endroit parfait.',
    position: 'auto',
  },
  {
    id: 'vendors',
    target: '[data-tour="vendors"]',
    title: 'Constituez votre équipe',
    description: 'Photographes, traiteurs, fleuristes... Accédez à 500+ prestataires vérifiés avec avis et notes authentiques.',
    position: 'auto',
  },
  {
    id: 'planning',
    target: '[data-tour="planning"]',
    title: 'Votre planning',
    description: 'Visualisez toutes vos étapes clés et rendez-vous. Du plus récent au plus ancien, suivez votre progression en temps réel.',
    position: 'auto',
  },
  {
    id: 'messaging',
    target: '[data-tour="messaging"]',
    title: 'Messagerie intégrée',
    description: 'Échangez directement avec vos prestataires, partagez des fichiers et gardez l\'historique de toutes vos conversations.',
    position: 'auto',
  },
];

interface InteractiveGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function InteractiveGuide({ isOpen, onClose, onComplete }: InteractiveGuideProps) {
  const {
    currentStep,
    isActive,
    isFirstStep,
    isLastStep,
    next,
    prev,
    stop,
    hasSeenTour,
  } = useTour({
    steps: CLIENT_DASHBOARD_STEPS,
    onComplete: () => {
      onComplete?.();
      onClose();
    },
    onSkip: () => {
      onClose();
    },
    persistKey: 'client_dashboard',
  });

  // Sync external isOpen with internal tour state
  React.useEffect(() => {
    if (isOpen && !isActive) {
      // Reset to first step when opening
      // We'll handle this by calling start through a ref
    }
  }, [isOpen, isActive]);

  // Start tour when opened
  React.useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Force start at step 0
        // This is handled by the tour hook internally
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <InteractiveTour
      steps={CLIENT_DASHBOARD_STEPS}
      isActive={isOpen}
      currentStep={currentStep}
      onNext={next}
      onPrev={prev}
      onClose={() => {
        stop();
        onClose();
      }}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
    />
  );
}

// Export the steps for use in other components
export { CLIENT_DASHBOARD_STEPS };
export type { TourStep };
