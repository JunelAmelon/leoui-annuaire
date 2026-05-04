'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  X, ChevronRight, ChevronLeft, Sparkles, Heart, MapPin,
  CalendarDays, Users, MessageSquare, CheckCircle, Lightbulb,
  ArrowRight, Home, LayoutDashboard
} from 'lucide-react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenue sur LeOui !',
    description: 'Votre espace couple tout-en-un pour organiser le mariage de vos rêves. Laissez-nous vous guider à travers les fonctionnalités principales.',
    icon: Sparkles,
  },
  {
    id: 'dashboard',
    title: 'Votre tableau de bord',
    description: 'Retrouvez ici un aperçu complet de votre mariage : compte à rebours, prestataires réservés, budget, et prochaines étapes.',
    icon: LayoutDashboard,
    target: '[data-guide="dashboard"]',
  },
  {
    id: 'venue',
    title: 'Choisissez votre lieu',
    description: 'Explorez notre réseau de lieux de réception vérifiés. Filtrez par région, capacité, et style pour trouver l\'endroit parfait.',
    icon: MapPin,
    target: '[data-guide="venue"]',
  },
  {
    id: 'vendors',
    title: 'Constituez votre équipe',
    description: 'Photographes, traiteurs, fleuristes... Accédez à 500+ prestataires vérifiés avec avis et notes authentiques.',
    icon: Users,
    target: '[data-guide="vendors"]',
  },
  {
    id: 'planning',
    title: 'Votre planning',
    description: 'Visualisez toutes vos étapes clés et rendez-vous. Du plus récent au plus ancien, suivez votre progression en temps réel.',
    icon: CalendarDays,
    target: '[data-guide="planning"]',
  },
  {
    id: 'messaging',
    title: 'Messagerie intégrée',
    description: 'Échangez directement avec vos prestataires, partagez des fichiers et gardez l\'historique de toutes vos conversations.',
    icon: MessageSquare,
    target: '[data-guide="messaging"]',
  },
  {
    id: 'complete',
    title: 'Vous êtes prêts !',
    description: 'Vous avez fait le tour des essentiels. N\'hésitez pas à revenir à ce guide à tout moment en cliquant sur le bouton Aide.',
    icon: CheckCircle,
  },
];

interface InteractiveGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function InteractiveGuide({ isOpen, onClose, onComplete }: InteractiveGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const pathname = usePathname();

  const step = GUIDE_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === GUIDE_STEPS.length - 1;

  // Calculate progress percentage
  const progress = ((currentStep + 1) / GUIDE_STEPS.length) * 100;

  useEffect(() => {
    if (isOpen && step.target) {
      // Find target element and position tooltip
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        setTooltipPosition({
          top: rect.bottom + 10,
          left: rect.left + rect.width / 2,
        });
        setShowTooltip(true);

        // Highlight target element
        targetEl.classList.add('guide-highlight');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        return () => {
          targetEl.classList.remove('guide-highlight');
        };
      }
    } else {
      setShowTooltip(false);
    }
  }, [isOpen, step]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete, onClose]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(() => {
    onComplete?.();
    onClose();
  }, [onComplete, onClose]);

  const goToStep = useCallback((index: number) => {
    setCurrentStep(index);
  }, []);

  if (!isOpen) return null;

  const StepIcon = step.icon;

  return (
    <>
      {/* Backdrop with spotlight effect */}
      <div 
        className="fixed inset-0 z-[100] bg-charcoal-900/80 backdrop-blur-sm transition-opacity"
        onClick={handleSkip}
      />

      {/* Highlight overlay for target element */}
      {step.target && showTooltip && (
        <div
          className="fixed z-[101] pointer-events-none"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Floating tooltip pointing to element */}
          <div className="bg-white rounded-xl shadow-2xl p-4 max-w-xs animate-bounce-in">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45" />
            <p className="text-sm font-semibold text-rose-600 mb-1">Étape {currentStep + 1}</p>
            <p className="text-xs text-charcoal-600">{step.title}</p>
          </div>
        </div>
      )}

      {/* Main Guide Card */}
      <div className="fixed bottom-4 left-4 right-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg z-[102]">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Header with progress */}
          <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <StepIcon className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-semibold text-sm sm:text-base">
                  Guide {currentStep + 1}/{GUIDE_STEPS.length}
                </span>
              </div>
              <button 
                onClick={handleSkip}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress bar */}
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <StepIcon className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-charcoal-900 text-lg mb-1">{step.title}</h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-1.5 mb-5">
              {GUIDE_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => goToStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep 
                      ? 'w-6 bg-rose-500' 
                      : idx < currentStep 
                        ? 'bg-rose-300' 
                        : 'bg-charcoal-200'
                  }`}
                  aria-label={`Aller à l'étape ${idx + 1}`}
                />
              ))}
            </div>

            {/* Tips for specific steps */}
            {step.id === 'vendors' && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>Astuce :</strong> Utilisez les filtres pour trouver des prestataires proches de votre lieu de mariage.
                  </p>
                </div>
              </div>
            )}
            {step.id === 'messaging' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    <strong>Astuce :</strong> Vous pouvez joindre des photos et des documents PDF à vos messages.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with navigation */}
          <div className="px-4 py-4 sm:px-6 border-t border-charcoal-100 bg-charcoal-50/50">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isFirstStep 
                    ? 'text-charcoal-300 cursor-not-allowed' 
                    : 'text-charcoal-600 hover:bg-charcoal-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkip}
                  className="hidden sm:block px-3 py-2 text-charcoal-500 hover:text-charcoal-700 text-sm font-medium transition-colors"
                >
                  Passer le guide
                </button>
                <button
                  onClick={handleNext}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-rose-200 hover:shadow-rose-300"
                >
                  {isLastStep ? 'Terminer' : 'Continuer'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile skip button */}
        <button
          onClick={handleSkip}
          className="sm:hidden mt-3 w-full py-3 text-charcoal-500 text-sm font-medium hover:text-charcoal-700 transition-colors"
        >
          Passer le guide
        </button>
      </div>

      {/* CSS for guide highlight effect */}
      <style jsx global>{`
        .guide-highlight {
          position: relative;
          z-index: 101;
          box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.3), 0 0 0 8px rgba(225, 29, 72, 0.1);
          border-radius: 8px;
          animation: pulse-ring 2s ease-in-out infinite;
        }
        
        @keyframes pulse-ring {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.3), 0 0 0 8px rgba(225, 29, 72, 0.1);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(225, 29, 72, 0.3), 0 0 0 12px rgba(225, 29, 72, 0.1);
          }
        }
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          60% {
            transform: translateY(5px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}</style>
    </>
  );
}
