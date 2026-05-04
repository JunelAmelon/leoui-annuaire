'use client';

import { useEffect, useRef, useState } from 'react';
import VendorCard from '@/components/VendorCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  startingPrice?: string;
}

interface SimilarVendorsCarouselProps {
  vendors: Vendor[];
  hrefBase: string;
}

export default function SimilarVendorsCarousel({ vendors, hrefBase }: SimilarVendorsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Auto-scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || vendors.length <= 3) return;

    let animationId: number;
    let scrollPosition = container.scrollLeft;
    const scrollSpeed = 0.5; // pixels per frame

    const scroll = () => {
      if (!isPaused && container) {
        scrollPosition += scrollSpeed;
        
        // Reset when reaching end for infinite loop effect
        if (scrollPosition >= container.scrollWidth - container.clientWidth) {
          scrollPosition = 0;
        }
        
        container.scrollLeft = scrollPosition;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, vendors.length]);

  // Update scroll buttons state
  const updateScrollButtons = () => {
    const container = scrollRef.current;
    if (!container) return;
    
    setCanScrollLeft(container.scrollLeft > 10);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', updateScrollButtons);
    updateScrollButtons();
    
    return () => container.removeEventListener('scroll', updateScrollButtons);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;
    
    const scrollAmount = 320; // Card width + gap
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Duplicate vendors for infinite scroll effect
  const displayVendors = vendors.length > 3 ? [...vendors, ...vendors] : vendors;

  return (
    <section className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="font-display text-xl sm:text-display-sm text-charcoal-900">
            Prestataires similaires
          </h2>
          
          {vendors.length > 3 && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                className="w-10 h-10 rounded-full border border-charcoal-200 flex items-center justify-center hover:border-rose-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                className="w-10 h-10 rounded-full border border-charcoal-200 flex items-center justify-center hover:border-rose-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setTimeout(() => setIsPaused(false), 3000)}
          className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {displayVendors.map((v, index) => (
            <div
              key={`${v.id}-${index}`}
              className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
            >
              <VendorCard
                id={v.id}
                name={v.name}
                category={v.category}
                location={v.location}
                rating={v.rating || 5}
                reviewCount={v.reviewCount || 0}
                imageUrl={v.imageUrl}
                startingPrice={v.startingPrice}
                hrefBase={hrefBase}
              />
            </div>
          ))}
        </div>

        {/* Mobile scroll indicator */}
        {vendors.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-4 sm:hidden">
            {vendors.slice(0, Math.min(vendors.length, 5)).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-charcoal-300"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
