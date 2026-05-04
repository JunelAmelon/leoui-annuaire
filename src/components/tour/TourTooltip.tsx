'use client';

import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';

interface TooltipRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourTooltipProps {
  targetSelector: string | null;
  isVisible: boolean;
  title: string;
  description: string;
  stepNumber: number;
  totalSteps: number;
  position?: TooltipPosition;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  /**
   * Callback quand l'élément cible n'est pas trouvé
   */
  onTargetNotFound?: () => void;
  /**
   * Délai max d'attente pour que l'élément apparaisse (ms)
   */
  maxWaitForTarget?: number;
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_MIN_HEIGHT = 180;
const GAP = 16;
const VIEWPORT_MARGIN = 16;

export default function TourTooltip({
  targetSelector,
  isVisible,
  title,
  description,
  stepNumber,
  totalSteps,
  position = 'auto',
  onNext,
  onPrev,
  onClose,
  isFirstStep,
  isLastStep,
  onTargetNotFound,
  maxWaitForTarget = 5000,
}: TourTooltipProps) {
  const [tooltipRect, setTooltipRect] = useState<TooltipRect | null>(null);
  const [actualPosition, setActualPosition] = useState<TooltipPosition>('bottom');
  const [isReady, setIsReady] = useState(false);
  const [targetFound, setTargetFound] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const targetElementRef = useRef<Element | null>(null);

  /**
   * Algorithme de positionnement intelligent (floating UI style)
   * Calcule la meilleure position avec fallback automatique
   */
  const calculatePosition = useCallback(() => {
    if (!targetSelector || !isVisible) {
      setIsReady(false);
      return;
    }

    const target = document.querySelector(targetSelector);
    if (!target) {
      setTargetFound(false);
      return;
    }

    targetElementRef.current = target;
    setTargetFound(true);

    const targetRect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Get actual tooltip dimensions if available
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth || TOOLTIP_WIDTH;
    const tooltipHeight = tooltipEl?.offsetHeight || TOOLTIP_MIN_HEIGHT;

    // Calculate available space in each direction
    const spaceTop = targetRect.top - VIEWPORT_MARGIN;
    const spaceBottom = viewportHeight - targetRect.bottom - VIEWPORT_MARGIN;
    const spaceLeft = targetRect.left - VIEWPORT_MARGIN;
    const spaceRight = viewportWidth - targetRect.right - VIEWPORT_MARGIN;

    // Scoring system for position selection
    interface PositionScore {
      pos: TooltipPosition;
      score: number;
      fits: boolean;
    }

    const positions: PositionScore[] = [
      {
        pos: 'bottom',
        score: spaceBottom - tooltipHeight - GAP,
        fits: spaceBottom >= tooltipHeight + GAP,
      },
      {
        pos: 'top',
        score: spaceTop - tooltipHeight - GAP,
        fits: spaceTop >= tooltipHeight + GAP,
      },
      {
        pos: 'right',
        score: spaceRight - tooltipWidth - GAP,
        fits: spaceRight >= tooltipWidth + GAP,
      },
      {
        pos: 'left',
        score: spaceLeft - tooltipWidth - GAP,
        fits: spaceLeft >= tooltipWidth + GAP,
      },
    ];

    // Determine best position
    let bestPosition: TooltipPosition;
    
    if (position !== 'auto') {
      // Check if requested position fits
      const requested = positions.find(p => p.pos === position);
      if (requested?.fits) {
        bestPosition = position;
      } else {
        // Find first fitting position, or best score
        const fitting = positions.filter(p => p.fits);
        if (fitting.length > 0) {
          bestPosition = fitting.sort((a, b) => b.score - a.score)[0].pos;
        } else {
          bestPosition = positions.sort((a, b) => b.score - a.score)[0].pos;
        }
      }
    } else {
      // Mobile-first: prefer bottom or top
      if (viewportWidth < 768) {
        const bottomFits = spaceBottom >= tooltipHeight + GAP;
        const topFits = spaceTop >= tooltipHeight + GAP;
        
        if (bottomFits) {
          bestPosition = 'bottom';
        } else if (topFits) {
          bestPosition = 'top';
        } else {
          // Mobile bottom sheet style if no space
          bestPosition = 'bottom';
        }
      } else {
        // Desktop: use scoring
        const fitting = positions.filter(p => p.fits);
        if (fitting.length > 0) {
          bestPosition = fitting.sort((a, b) => b.score - a.score)[0].pos;
        } else {
          bestPosition = positions.sort((a, b) => b.score - a.score)[0].pos;
        }
      }
    }

    setActualPosition(bestPosition);

    // Calculate tooltip position with smart fallback
    let tooltipTop = 0;
    let tooltipLeft = 0;

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    switch (bestPosition) {
      case 'bottom': {
        const idealTop = targetRect.bottom + GAP + scrollY;
        tooltipTop = Math.max(
          VIEWPORT_MARGIN + scrollY,
          Math.min(
            idealTop,
            document.documentElement.scrollHeight - tooltipHeight - VIEWPORT_MARGIN
          )
        );
        tooltipLeft = Math.max(
          VIEWPORT_MARGIN + scrollX,
          Math.min(
            targetCenterX - tooltipWidth / 2 + scrollX,
            viewportWidth - tooltipWidth - VIEWPORT_MARGIN + scrollX
          )
        );
        break;
      }
      case 'top': {
        const idealTop = targetRect.top - GAP - tooltipHeight + scrollY;
        tooltipTop = Math.max(VIEWPORT_MARGIN + scrollY, idealTop);
        tooltipLeft = Math.max(
          VIEWPORT_MARGIN + scrollX,
          Math.min(
            targetCenterX - tooltipWidth / 2 + scrollX,
            viewportWidth - tooltipWidth - VIEWPORT_MARGIN + scrollX
          )
        );
        break;
      }
      case 'left': {
        tooltipTop = Math.max(
          VIEWPORT_MARGIN + scrollY,
          Math.min(
            targetCenterY - tooltipHeight / 2 + scrollY,
            document.documentElement.scrollHeight - tooltipHeight - VIEWPORT_MARGIN
          )
        );
        const idealLeft = targetRect.left - GAP - tooltipWidth + scrollX;
        tooltipLeft = Math.max(VIEWPORT_MARGIN + scrollX, idealLeft);
        break;
      }
      case 'right': {
        tooltipTop = Math.max(
          VIEWPORT_MARGIN + scrollY,
          Math.min(
            targetCenterY - tooltipHeight / 2 + scrollY,
            document.documentElement.scrollHeight - tooltipHeight - VIEWPORT_MARGIN
          )
        );
        const idealLeft = targetRect.right + GAP + scrollX;
        tooltipLeft = Math.max(
          VIEWPORT_MARGIN + scrollX,
          Math.min(
            idealLeft,
            viewportWidth - tooltipWidth - VIEWPORT_MARGIN + scrollX
          )
        );
        break;
      }
    }

    // Mobile bottom sheet fallback when element takes full width
    if (viewportWidth < 640 && targetRect.width > viewportWidth * 0.8) {
      tooltipLeft = VIEWPORT_MARGIN + scrollX;
      tooltipTop = Math.max(
        tooltipTop,
        viewportHeight - tooltipHeight - VIEWPORT_MARGIN + scrollY
      );
    }

    setTooltipRect({
      top: tooltipTop,
      left: tooltipLeft,
      width: tooltipWidth,
      height: tooltipHeight,
    });

    setIsReady(true);
  }, [targetSelector, isVisible, position]);

  /**
   * Retry logic pour attendre que l'élément apparaisse dans le DOM
   */
  useEffect(() => {
    if (!isVisible || !targetSelector) {
      setIsReady(false);
      setTargetFound(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = Math.ceil(maxWaitForTarget / 100);
    let found = false;

    const checkTarget = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        found = true;
        targetElementRef.current = target;
        setTargetFound(true);
        calculatePosition();
        
        // Scroll l'élément en vue avec retry pour animations
        setTimeout(() => {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }, 100);
        
        // Recalcul après scroll
        setTimeout(() => {
          calculatePosition();
        }, 600);
        
        return true;
      }
      return false;
    };

    // Try immediately
    if (checkTarget()) return;

    // Retry interval
    const interval = setInterval(() => {
      attempts++;
      if (checkTarget()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn(`[TourTooltip] Target "${targetSelector}" not found after ${maxWaitForTarget}ms`);
        onTargetNotFound?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [targetSelector, isVisible, stepNumber, maxWaitForTarget, onTargetNotFound, calculatePosition]);

  /**
   * ResizeObserver pour recalculer quand le target change de taille
   */
  useEffect(() => {
    if (!isVisible || !targetFound) return;

    // Cleanup previous observers
    resizeObserverRef.current?.disconnect();
    
    const target = targetElementRef.current;
    if (!target) return;

    // Create new ResizeObserver
    resizeObserverRef.current = new ResizeObserver(() => {
      // Debounced recalculation
      requestAnimationFrame(calculatePosition);
    });

    resizeObserverRef.current.observe(target);
    
    // Also observe body for layout changes
    if (document.body) {
      resizeObserverRef.current.observe(document.body);
    }

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [isVisible, targetFound, calculatePosition]);

  /**
   * MutationObserver pour détecter les changements DOM
   */
  useEffect(() => {
    if (!isVisible) return;

    mutationObserverRef.current?.disconnect();

    mutationObserverRef.current = new MutationObserver((mutations) => {
      // Check if our target was affected
      const hasRelevantMutation = mutations.some(mutation => {
        // Check if mutation affects target or its ancestors
        const target = targetElementRef.current;
        if (!target) return false;
        
        return (
          mutation.target === target ||
          target.contains(mutation.target as Node) ||
          (mutation.target as Element).contains?.(target)
        );
      });

      if (hasRelevantMutation) {
        requestAnimationFrame(calculatePosition);
      }
    });

    mutationObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => {
      mutationObserverRef.current?.disconnect();
    };
  }, [isVisible, calculatePosition]);

  /**
   * Event listeners pour resize et scroll
   */
  useEffect(() => {
    if (!isVisible || !isReady) return;

    let resizeTimeout: NodeJS.Timeout | null = null;
    let ticking = false;

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculatePosition();
      }, 100);
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          calculatePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isVisible, isReady, calculatePosition]);

  /**
   * Recalcul après changement de dimensions du tooltip
   */
  useLayoutEffect(() => {
    if (!isVisible || !isReady) return;
    
    // Recalcul quand le tooltip est rendu pour la première fois
    const timer = setTimeout(calculatePosition, 0);
    return () => clearTimeout(timer);
  }, [isVisible, isReady, calculatePosition]);

  if (!isVisible || !tooltipRect) return null;

  const { top, left } = tooltipRect;
  const progress = (stepNumber / totalSteps) * 100;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[102] animate-tooltip-in"
      style={{
        top,
        left,
        width: TOOLTIP_WIDTH,
      }}
    >
      {/* Arrow pointing to target */}
      <div
        className={`absolute w-3 h-3 bg-white transform rotate-45 ${
          actualPosition === 'bottom'
            ? '-top-1.5 left-1/2 -translate-x-1/2'
            : actualPosition === 'top'
            ? '-bottom-1.5 left-1/2 -translate-x-1/2'
            : actualPosition === 'left'
            ? '-right-1.5 top-1/2 -translate-y-1/2'
            : '-left-1.5 top-1/2 -translate-y-1/2'
        }`}
      />

      {/* Tooltip card */}
      <div className="bg-white rounded-2xl shadow-2xl border border-charcoal-100 overflow-hidden">
        {/* Header with progress */}
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white/80 text-xs font-medium">
                {stepNumber} / {totalSteps}
              </span>
              <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Fermer le guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-charcoal-900 text-base mb-2">
            {title}
          </h3>
          <p className="text-charcoal-600 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Footer with navigation */}
        <div className="px-4 py-3 bg-charcoal-50 border-t border-charcoal-100 flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={isFirstStep}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isFirstStep
                ? 'text-charcoal-300 cursor-not-allowed'
                : 'text-charcoal-600 hover:bg-charcoal-200'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-charcoal-500 hover:text-charcoal-700 text-sm font-medium px-2 py-1.5 hover:bg-charcoal-200 rounded-lg transition-colors"
            >
              Quitter
            </button>
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              {isLastStep ? 'Terminer' : 'Suivant'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
