'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { SimpleHelp, PageHelps, HelpState } from './types';

interface SimpleHelpContextType extends HelpState {
  /** Activer/désactiver l'aide */
  toggleHelp: () => void;
  /** Afficher une aide spécifique */
  showHelp: (helpId: string) => void;
  /** Masquer une aide spécifique */
  hideHelp: (helpId: string) => void;
  /** Afficher toutes les aides de la page */
  showAllHelps: () => void;
  /** Masquer toutes les aides */
  hideAllHelps: () => void;
  /** Marquer une aide comme vue */
  markAsSeen: (helpId: string) => void;
  /** Vérifier si une aide a été vue */
  hasSeen: (helpId: string) => boolean;
  /** Aides de la page courante */
  pageHelps: SimpleHelp[];
}

const SimpleHelpContext = createContext<SimpleHelpContextType | undefined>(undefined);

const STORAGE_KEY = 'leoui_help_seen_v1';

export function SimpleHelpProvider({ 
  children, 
  pageHelps: config,
  disabled = false 
}: { 
  children: React.ReactNode;
  pageHelps?: PageHelps;
  disabled?: boolean;
}) {
  const [state, setState] = useState<HelpState>({
    isActive: false,
    currentHelpId: null,
    visibleHelpIds: [],
    seenHelpIds: [],
  });

  const autoShowTriggered = useRef(false);

  // Load seen helps from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const seen = JSON.parse(stored);
        setState(prev => ({ ...prev, seenHelpIds: seen }));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save seen helps
  const saveSeenHelps = useCallback((seenIds: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seenIds));
    } catch {
      // Ignore
    }
  }, []);

  // Mark as seen
  const markAsSeen = useCallback((helpId: string) => {
    setState(prev => {
      if (prev.seenHelpIds.includes(helpId)) return prev;
      const newSeen = [...prev.seenHelpIds, helpId];
      saveSeenHelps(newSeen);
      return { ...prev, seenHelpIds: newSeen };
    });
  }, [saveSeenHelps]);

  // Check if seen
  const hasSeen = useCallback((helpId: string) => {
    return state.seenHelpIds.includes(helpId);
  }, [state.seenHelpIds]);

  // Toggle help mode
  const toggleHelp = useCallback(() => {
    setState(prev => {
      const newActive = !prev.isActive;
      return {
        ...prev,
        isActive: newActive,
        visibleHelpIds: newActive && config ? config.helps.map(h => h.id) : [],
      };
    });
  }, [config]);

  // Show specific help
  const showHelp = useCallback((helpId: string) => {
    setState(prev => ({
      ...prev,
      isActive: true,
      visibleHelpIds: prev.visibleHelpIds.includes(helpId) 
        ? prev.visibleHelpIds 
        : [...prev.visibleHelpIds, helpId],
    }));
  }, []);

  // Hide specific help
  const hideHelp = useCallback((helpId: string) => {
    setState(prev => ({
      ...prev,
      visibleHelpIds: prev.visibleHelpIds.filter(id => id !== helpId),
    }));
  }, []);

  // Show all helps
  const showAllHelps = useCallback(() => {
    if (!config) return;
    setState(prev => ({
      ...prev,
      isActive: true,
      visibleHelpIds: config.helps.map(h => h.id),
    }));
  }, [config]);

  // Hide all helps
  const hideAllHelps = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      visibleHelpIds: [],
    }));
  }, []);

  // Auto-show on first visit
  useEffect(() => {
    if (disabled || !config?.autoShowOnFirstVisit || autoShowTriggered.current) return;
    
    // Check if any help from this page has been seen
    const hasSeenAny = config.helps.some(h => state.seenHelpIds.includes(h.id));
    if (hasSeenAny) return;

    autoShowTriggered.current = true;
    const delay = config.autoShowDelay || 2000;
    
    const timer = setTimeout(() => {
      showAllHelps();
    }, delay);

    return () => clearTimeout(timer);
  }, [config, disabled, state.seenHelpIds, showAllHelps]);

  const value: SimpleHelpContextType = {
    ...state,
    toggleHelp,
    showHelp,
    hideHelp,
    showAllHelps,
    hideAllHelps,
    markAsSeen,
    hasSeen,
    pageHelps: config?.helps || [],
  };

  return (
    <SimpleHelpContext.Provider value={value}>
      {children}
    </SimpleHelpContext.Provider>
  );
}

export function useSimpleHelp() {
  const context = useContext(SimpleHelpContext);
  if (context === undefined) {
    throw new Error('useSimpleHelp must be used within SimpleHelpProvider');
  }
  return context;
}

export default SimpleHelpContext;
