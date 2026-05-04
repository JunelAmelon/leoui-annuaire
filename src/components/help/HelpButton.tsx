'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import type { HelpButtonProps } from './types';

/**
 * Bouton d'aide discret et moderne
 * 
 * Design options:
 * - default: Blanc avec ombre subtile
 * - ghost: Transparent avec bordure
 * - gold: Thème LeOui avec couleur gold
 */
export function HelpButton({
  position = 'bottom-right',
  size = 'md',
  variant = 'default',
  tooltipText = "Afficher l'aide",
  onClick,
  isActive = false,
}: HelpButtonProps) {
  const positionStyles = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const sizeStyles = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantStyles = {
    default: `bg-white text-charcoal-700 shadow-lg shadow-charcoal-900/10 
              hover:shadow-xl hover:shadow-charcoal-900/15 hover:scale-105
              border border-charcoal-100`,
    ghost: `bg-transparent text-charcoal-600 border-2 border-charcoal-200 
            hover:bg-charcoal-50 hover:border-charcoal-300`,
    gold: `bg-gold-500 text-white shadow-lg shadow-gold-500/25 
           hover:shadow-xl hover:shadow-gold-500/30 hover:scale-105
           ${isActive ? 'ring-4 ring-gold-200' : ''}`,
  };

  return (
    <button
      onClick={onClick}
      className={`
        fixed ${positionStyles[position]} ${sizeStyles[size]}
        rounded-full flex items-center justify-center
        transition-all duration-200 ease-out
        ${variantStyles[variant]}
        focus:outline-none focus:ring-2 focus:ring-offset-2 
        ${variant === 'gold' ? 'focus:ring-gold-400' : 'focus:ring-charcoal-400'}
        z-[9990]
      `}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <HelpCircle className={`${iconSizes[size]} ${isActive ? 'animate-pulse' : ''}`} />
      
      {/* Badge "actif" */}
      {isActive && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
      )}
    </button>
  );
}

/**
 * Version floatante (intégrée dans l'UI, pas fixed)
 */
export function HelpButtonInline({
  size = 'sm',
  variant = 'ghost',
  onClick,
  isActive = false,
}: Omit<HelpButtonProps, 'position'>) {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantStyles = {
    default: `bg-white text-charcoal-600 shadow-sm border border-charcoal-200 
              hover:bg-charcoal-50 hover:text-charcoal-800`,
    ghost: `bg-transparent text-charcoal-400 hover:text-charcoal-600 
            hover:bg-charcoal-50`,
    gold: `bg-gold-100 text-gold-700 hover:bg-gold-200 hover:text-gold-800`,
  };

  return (
    <button
      onClick={onClick}
      className={`
        ${sizeStyles[size]} rounded-full 
        inline-flex items-center justify-center
        transition-all duration-150
        ${variantStyles[variant]}
        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gold-400
        ${isActive ? 'ring-2 ring-gold-400 ring-offset-1' : ''}
      `}
      title="Afficher l'aide"
      aria-label="Afficher l'aide"
    >
      <HelpCircle className={`${iconSizes[size]} ${isActive ? 'animate-pulse' : ''}`} />
    </button>
  );
}

export default HelpButton;
