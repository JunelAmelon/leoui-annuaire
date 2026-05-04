'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  targetSelector: string | null;
  isActive: boolean;
  onClick?: () => void;
  padding?: number;
  borderRadius?: number;
  /**
   * Délai max d'attente pour que l'élément apparaisse (ms)
   */
  maxWaitForTarget?: number;
  /**
   * Callback quand l'élément cible n'est pas trouvé
   */
  onTargetNotFound?: () => void;
}

export default function TourOverlay({
  targetSelector,
  isActive,
  onClick,
  padding = 8,
  borderRadius = 12,
  maxWaitForTarget = 3000,
  onTargetNotFound,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isReady, setIsReady] = useState(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const targetElementRef = useRef<Element | null>(null);

  /**
   * Calculate target element position avec retry
   */
  const calculatePosition = useCallback(() => {
    if (!targetSelector || !isActive) {
      setTargetRect(null);
      setIsReady(false);
      return;
    }

    const element = document.querySelector(targetSelector);
    if (!element) {
      // Don't clear targetRect immediately - might be loading
      if (!targetElementRef.current) {
        setTargetRect(null);
      }
      return;
    }

    targetElementRef.current = element;
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    setTargetRect({
      top: rect.top + scrollY - padding,
      left: rect.left + scrollX - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    setWindowSize({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    });

    setIsReady(true);
  }, [targetSelector, isActive, padding]);

  /**
   * Retry logic avec intervalle pour attendre l'élément
   */
  useEffect(() => {
    if (!isActive || !targetSelector) {
      setIsReady(false);
      targetElementRef.current = null;
      return;
    }

    let attempts = 0;
    const maxAttempts = Math.ceil(maxWaitForTarget / 100);
    let found = false;

    const checkTarget = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        found = true;
        targetElementRef.current = element;
        calculatePosition();
        return true;
      }
      return false;
    };

    // Try immediately
    if (checkTarget()) return;

    // Retry with interval
    const interval = setInterval(() => {
      attempts++;
      if (checkTarget()) {
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn(`[TourOverlay] Target "${targetSelector}" not found after ${maxWaitForTarget}ms`);
        onTargetNotFound?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [targetSelector, isActive, maxWaitForTarget, onTargetNotFound, calculatePosition]);

  /**
   * ResizeObserver pour recalculer quand le target change de taille
   */
  useEffect(() => {
    if (!isActive || !targetElementRef.current) return;

    // Cleanup previous
    resizeObserverRef.current?.disconnect();

    resizeObserverRef.current = new ResizeObserver(() => {
      requestAnimationFrame(calculatePosition);
    });

    resizeObserverRef.current.observe(targetElementRef.current);
    
    if (document.body) {
      resizeObserverRef.current.observe(document.body);
    }

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [isActive, calculatePosition]);

  /**
   * Event listeners pour resize et scroll
   */
  useEffect(() => {
    if (!isActive || !isReady) return;

    let ticking = false;

    const handleResize = () => {
      requestAnimationFrame(() => {
        calculatePosition();
      });
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
    };
  }, [isActive, isReady, calculatePosition]);

  if (!isActive) return null;

  // No target - full dark overlay
  if (!targetRect) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-charcoal-950/85 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in"
        onClick={onClick}
      />
    );
  }

  // With target - overlay with cutout
  const { top, left, width, height } = targetRect;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none animate-fade-in">
      {/* SVG overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto"
        style={{ minWidth: windowSize.width, minHeight: windowSize.height }}
        onClick={onClick}
      >
        <defs>
          <mask id="tour-cutout">
            {/* Full white rectangle (visible area) */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black rectangle where target is (creates hole) */}
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        
        {/* Dark overlay with cutout mask */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.85)"
          mask="url(#tour-cutout)"
          className="backdrop-blur-[2px]"
        />
        
        {/* Animated border around the cutout */}
        <rect
          x={left}
          y={top}
          width={width}
          height={height}
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke="rgba(244, 63, 94, 0.8)"
          strokeWidth="3"
          className="animate-pulse-stroke pointer-events-none"
        />
        
        {/* Inner glow effect */}
        <rect
          x={left + 2}
          y={top + 2}
          width={width - 4}
          height={height - 4}
          rx={borderRadius - 2}
          ry={borderRadius - 2}
          fill="none"
          stroke="rgba(244, 63, 94, 0.3)"
          strokeWidth="8"
          className="pointer-events-none"
        />
      </svg>
    </div>
  );
}
