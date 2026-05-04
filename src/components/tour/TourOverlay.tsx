'use client';

import React, { useEffect, useState, useCallback } from 'react';

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
}

export default function TourOverlay({
  targetSelector,
  isActive,
  onClick,
  padding = 8,
  borderRadius = 12,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Calculate target element position
  const calculatePosition = useCallback(() => {
    if (!targetSelector || !isActive) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(targetSelector);
    if (!element) {
      setTargetRect(null);
      return;
    }

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
  }, [targetSelector, isActive, padding]);

  // Initial calculation and resize handler
  useEffect(() => {
    if (!isActive) return;

    calculatePosition();

    const handleResize = () => {
      // Small delay to ensure DOM is settled
      setTimeout(calculatePosition, 100);
    };

    const handleScroll = () => {
      calculatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Recalculate after a short delay to handle any dynamic content
    const timeoutId = setTimeout(calculatePosition, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      clearTimeout(timeoutId);
    };
  }, [calculatePosition, isActive]);

  // Recalculate when target changes
  useEffect(() => {
    if (isActive && targetSelector) {
      // Multiple attempts to catch dynamic content
      const timeouts = [100, 300, 600].map((delay) =>
        setTimeout(calculatePosition, delay)
      );
      return () => timeouts.forEach(clearTimeout);
    }
  }, [targetSelector, isActive, calculatePosition]);

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
