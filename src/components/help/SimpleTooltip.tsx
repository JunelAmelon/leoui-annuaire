'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { SimpleHelp, HelpTooltipProps } from './types';

/**
 * Composant SimpleTooltip - Infobulle moderne et minimaliste
 * 
 * Design inspiré de Notion/Airbnb :
 * - Petite taille
 * - Coins arrondis
 * - Ombre subtile
 * - Animation fluide
 * - Pas de flèche (clean design)
 */
function SimpleTooltipContent({ 
  help, 
  onClose,
  variant = 'light'
}: { 
  help: SimpleHelp; 
  onClose: () => void;
  variant?: 'light' | 'dark' | 'gold';
}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close après délai
  useEffect(() => {
    if (help.autoCloseDelay && help.autoCloseDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        onClose();
      }, help.autoCloseDelay);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [help.autoCloseDelay, onClose]);

  const variantStyles = {
    light: 'bg-white text-charcoal-800 shadow-lg shadow-charcoal-900/10 border border-charcoal-100',
    dark: 'bg-charcoal-900 text-white shadow-xl shadow-charcoal-900/20',
    gold: 'bg-gold-50 text-gold-900 shadow-lg shadow-gold-500/15 border border-gold-200',
  };

  return (
    <div className={`relative rounded-xl p-3.5 min-w-[200px] max-w-[280px] ${variantStyles[variant]} animate-tooltip-pop`}>
      {/* Close button - petit et discret */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Content */}
      <div className="pr-5">
        {help.icon && (
          <span className="text-base mr-1.5">{help.icon}</span>
        )}
        <p className="text-sm font-medium leading-relaxed">
          {help.message}
        </p>
      </div>
    </div>
  );
}

/**
 * Positionnement intelligent (floating UI style simplifié)
 */
function getPositionStyles(
  targetRect: DOMRect,
  tooltipHeight: number = 80,
  position: SimpleHelp['position'] = 'auto'
): React.CSSProperties {
  const margin = 12;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

  // Position auto = choisir la meilleure position
  let finalPosition = position;
  if (position === 'auto') {
    const spaceTop = targetRect.top;
    const spaceBottom = viewportHeight - targetRect.bottom;
    finalPosition = spaceBottom > spaceTop ? 'bottom' : 'top';
  }

  // Calculer la position
  let top = 0;
  let left = targetRect.left + targetRect.width / 2;

  switch (finalPosition) {
    case 'top':
      top = targetRect.top - margin - tooltipHeight;
      break;
    case 'bottom':
      top = targetRect.bottom + margin;
      break;
    case 'left':
      left = targetRect.left - margin - 200; // approx tooltip width
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      break;
    case 'right':
      left = targetRect.right + margin;
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      break;
  }

  // Clamp to viewport
  if (left < 10) left = 10;
  if (left > viewportWidth - 290) left = viewportWidth - 290;
  if (top < 10) top = targetRect.bottom + margin; // fallback to bottom

  return {
    position: 'fixed',
    top,
    left,
    zIndex: 9999,
    transform: 'translateX(-50%)',
  };
}

/**
 * SimpleTooltip avec positionnement intelligent
 */
export function SimpleTooltip({ 
  help, 
  isVisible, 
  onClose,
  variant = 'light'
}: HelpTooltipProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<React.CSSProperties>({});

  // Trouver l'élément cible
  useEffect(() => {
    if (!isVisible) return;
    
    const element = document.querySelector(help.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      
      // Calculer la position
      const rect = element.getBoundingClientRect();
      setPosition(getPositionStyles(rect, 80, help.position));
      
      // Highlight léger
      element.style.outline = '2px solid rgba(212, 175, 55, 0.5)';
      element.style.outlineOffset = '4px';
      element.style.transition = 'outline 0.2s ease';
      element.style.borderRadius = '4px';
    }

    return () => {
      if (element) {
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.transition = '';
        element.style.borderRadius = '';
      }
    };
  }, [help.target, help.position, isVisible]);

  // Recalculer sur resize/scroll
  useEffect(() => {
    if (!isVisible || !targetElement) return;

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      setPosition(getPositionStyles(rect, 80, help.position));
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isVisible, targetElement, help.position]);

  if (!isVisible || !targetElement) return null;

  return (
    <div style={position} className="pointer-events-auto">
      <SimpleTooltipContent 
        help={help} 
        onClose={onClose}
        variant={variant}
      />
    </div>
  );
}

export default SimpleTooltip;
