'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_MIN_HEIGHT = 180;
const GAP = 16;

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
}: TourTooltipProps) {
  const [tooltipRect, setTooltipRect] = useState<TooltipRect | null>(null);
  const [actualPosition, setActualPosition] = useState<TooltipPosition>('bottom');
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!targetSelector || !isVisible) return;

    const target = document.querySelector(targetSelector);
    if (!target) return;

    const targetRect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Calculate available space in each direction
    const spaceTop = targetRect.top;
    const spaceBottom = viewportHeight - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = viewportWidth - targetRect.right;

    // Determine best position
    let bestPosition: TooltipPosition = position;
    
    if (position === 'auto') {
      // Mobile-first: prefer bottom or top
      if (viewportWidth < 640) {
        // On mobile, always prefer bottom if there's space
        bestPosition = spaceBottom > TOOLTIP_MIN_HEIGHT + GAP ? 'bottom' : 'top';
      } else {
        // Desktop: check all directions
        const spaces = [
          { pos: 'bottom' as TooltipPosition, space: spaceBottom },
          { pos: 'top' as TooltipPosition, space: spaceTop },
          { pos: 'right' as TooltipPosition, space: spaceRight },
          { pos: 'left' as TooltipPosition, space: spaceLeft },
        ];
        
        // Sort by available space (descending)
        spaces.sort((a, b) => b.space - a.space);
        bestPosition = spaces[0].pos;
      }
    }

    setActualPosition(bestPosition);

    // Calculate tooltip position
    let tooltipTop = 0;
    let tooltipLeft = 0;

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    switch (bestPosition) {
      case 'bottom':
        tooltipTop = targetRect.bottom + GAP + scrollY;
        tooltipLeft = Math.max(
          16,
          Math.min(
            targetCenterX - TOOLTIP_WIDTH / 2 + scrollX,
            viewportWidth - TOOLTIP_WIDTH - 16 + scrollX
          )
        );
        break;
      case 'top':
        tooltipTop = targetRect.top - GAP - TOOLTIP_MIN_HEIGHT + scrollY;
        // Ensure it doesn't go above viewport
        if (tooltipTop < scrollY + 16) {
          tooltipTop = targetRect.bottom + GAP + scrollY;
          setActualPosition('bottom');
        }
        tooltipLeft = Math.max(
          16,
          Math.min(
            targetCenterX - TOOLTIP_WIDTH / 2 + scrollX,
            viewportWidth - TOOLTIP_WIDTH - 16 + scrollX
          )
        );
        break;
      case 'left':
        tooltipTop = Math.max(
          16 + scrollY,
          Math.min(
            targetCenterY - TOOLTIP_MIN_HEIGHT / 2 + scrollY,
            document.documentElement.scrollHeight - TOOLTIP_MIN_HEIGHT - 16
          )
        );
        tooltipLeft = targetRect.left - TOOLTIP_WIDTH - GAP + scrollX;
        // If not enough space on left, flip to right
        if (tooltipLeft < 16) {
          tooltipLeft = targetRect.right + GAP + scrollX;
          setActualPosition('right');
        }
        break;
      case 'right':
        tooltipTop = Math.max(
          16 + scrollY,
          Math.min(
            targetCenterY - TOOLTIP_MIN_HEIGHT / 2 + scrollY,
            document.documentElement.scrollHeight - TOOLTIP_MIN_HEIGHT - 16
          )
        );
        tooltipLeft = targetRect.right + GAP + scrollX;
        // If not enough space on right, flip to left
        if (tooltipLeft + TOOLTIP_WIDTH > viewportWidth + scrollX - 16) {
          tooltipLeft = targetRect.left - TOOLTIP_WIDTH - GAP + scrollX;
          setActualPosition('left');
        }
        break;
    }

    // Mobile adjustment: fixed position at bottom
    if (viewportWidth < 640) {
      tooltipLeft = 16 + scrollX;
      tooltipTop = Math.max(
        tooltipTop,
        viewportHeight - 280 + scrollY // Ensure it's visible above fold
      );
    }

    setTooltipRect({
      top: tooltipTop,
      left: tooltipLeft,
      width: TOOLTIP_WIDTH,
      height: TOOLTIP_MIN_HEIGHT,
    });
  }, [targetSelector, isVisible, position]);

  // Calculate position on mount and when dependencies change
  useEffect(() => {
    if (!isVisible) return;

    calculatePosition();

    const handleResize = () => {
      setTimeout(calculatePosition, 100);
    };

    const handleScroll = () => {
      calculatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Multiple recalculations for dynamic content
    const timeouts = [100, 300, 500].map((delay) =>
      setTimeout(calculatePosition, delay)
    );

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      timeouts.forEach(clearTimeout);
    };
  }, [calculatePosition, isVisible]);

  // Scroll target into view
  useEffect(() => {
    if (!isVisible || !targetSelector) return;

    const target = document.querySelector(targetSelector);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [targetSelector, isVisible, stepNumber]);

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
