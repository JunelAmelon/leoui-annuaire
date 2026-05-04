'use client';

import React, { useEffect } from 'react';
import { SimpleTooltip } from './SimpleTooltip';
import { HelpButton } from './HelpButton';
import { useSimpleHelp } from './SimpleHelpContext';

/**
 * SimpleHelpManager - Gestionnaire global des aides
 * 
 * Affiche :
 * - Toutes les infobulles actives
 * - Le bouton d'aide flottant
 * - Gère les interactions clavier (Escape pour fermer)
 */
export function SimpleHelpManager() {
  const { 
    isActive, 
    visibleHelpIds, 
    pageHelps, 
    hideHelp, 
    hideAllHelps, 
    toggleHelp,
    markAsSeen,
  } = useSimpleHelp();

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        hideAllHelps();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, hideAllHelps]);

  // Fermer au clic ailleurs (optionnel - désactivé par défaut pour éviter fermeture accidentelle)
  // const handleOverlayClick = () => {
  //   hideAllHelps();
  // };

  if (!pageHelps || pageHelps.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bouton d'aide flottant */}
      <HelpButton
        position="bottom-right"
        variant={isActive ? 'gold' : 'default'}
        size="md"
        onClick={toggleHelp}
        isActive={isActive}
        tooltipText={isActive ? "Fermer l'aide" : "Afficher l'aide"}
      />

      {/* Infobulles actives */}
      {isActive && visibleHelpIds.map((helpId) => {
        const help = pageHelps.find(h => h.id === helpId);
        if (!help) return null;

        return (
          <SimpleTooltip
            key={helpId}
            help={help}
            isVisible={true}
            onClose={() => {
              hideHelp(helpId);
              markAsSeen(helpId);
            }}
            variant="gold"
          />
        );
      })}

      {/* Styles globaux pour les animations */}
      <style jsx global>{`
        @keyframes tooltip-pop {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(8px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .animate-tooltip-pop {
          animation: tooltip-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Highlight subtil des éléments aidés */
        [data-help-highlight] {
          position: relative;
          z-index: 100;
        }

        /* Overlay très léger quand l'aide est active */
        .help-active-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.02);
          pointer-events: none;
          z-index: 50;
        }
      `}</style>
    </>
  );
}

/**
 * Version inline - pour intégration dans une navbar ou header
 */
export function SimpleHelpManagerInline() {
  const { 
    isActive, 
    visibleHelpIds, 
    pageHelps, 
    hideHelp, 
    hideAllHelps, 
    toggleHelp,
    markAsSeen,
  } = useSimpleHelp();

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        hideAllHelps();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, hideAllHelps]);

  if (!pageHelps || pageHelps.length === 0) {
    return null;
  }

  return (
    <>
      {/* Infobulles actives */}
      {isActive && visibleHelpIds.map((helpId) => {
        const help = pageHelps.find(h => h.id === helpId);
        if (!help) return null;

        return (
          <SimpleTooltip
            key={helpId}
            help={help}
            isVisible={true}
            onClose={() => {
              hideHelp(helpId);
              markAsSeen(helpId);
            }}
            variant="gold"
          />
        );
      })}

      {/* Styles globaux */}
      <style jsx global>{`
        @keyframes tooltip-pop {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(8px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .animate-tooltip-pop {
          animation: tooltip-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}

export default SimpleHelpManager;
