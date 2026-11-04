'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Grid2x2, Heart, Share2, X } from 'lucide-react';

interface Props {
  images: string[];
  title: string;
  badge?: string;
  favorited: boolean;
  onFavorite: () => void;
  onShare: () => void;
}

// Galerie en mosaïque (1 grande + 2 empilées) + visionneuse plein écran.
// Aucune barre de défilement horizontale : miniatures en grille qui passe à la ligne.
export default function ListingGallery({ images, title, badge, favorited, onFavorite, onShare }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const open = viewerIndex !== null;
  const count = images.length;

  const go = useCallback(
    (delta: number) => setViewerIndex((i) => (i === null ? i : (i + delta + count) % count)),
    [count]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerIndex(null);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, go]);

  if (count === 0) {
    return <div className="aspect-[16/10] rounded-3xl bg-charcoal-100" />;
  }

  const tile = (i: number, className = '') => (
    <button
      type="button"
      onClick={() => setViewerIndex(i)}
      className={`relative overflow-hidden bg-charcoal-100 group ${className}`}
      aria-label={`Voir la photo ${i + 1}`}
    >
      <img
        src={images[i]}
        alt={i === 0 ? title : ''}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </button>
  );

  return (
    <>
      <div className="relative">
        {/* Mobile : une grande photo + compteur */}
        <div className="sm:hidden rounded-3xl overflow-hidden aspect-[4/3] relative">
          {tile(0, 'w-full h-full')}
        </div>

        {/* Desktop : mosaïque */}
        <div
          className={`hidden sm:grid gap-2 rounded-3xl overflow-hidden aspect-[16/10] ${
            count === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {count === 1 && tile(0)}
          {count === 2 && (
            <>
              {tile(0)}
              {tile(1)}
            </>
          )}
          {count >= 3 && (
            <>
              {tile(0, 'row-span-2')}
              {tile(1)}
              {tile(2)}
            </>
          )}
        </div>

        {badge && (
          <span className="absolute top-4 left-4 bg-charcoal-900/90 text-white text-xs font-semibold px-3 py-1.5 rounded-full pointer-events-none">
            {badge}
          </span>
        )}

        {/* Actions flottantes */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            aria-label="Partager"
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-charcoal-800 hover:scale-105 transition-transform"
          >
            <Share2 className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={onFavorite}
            aria-label="Favoris"
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Heart className={`w-[18px] h-[18px] ${favorited ? 'fill-rose-600 text-rose-600' : 'text-charcoal-800'}`} />
          </button>
        </div>

        {/* Voir toutes les photos */}
        {count > 1 && (
          <button
            type="button"
            onClick={() => setViewerIndex(0)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white shadow-md rounded-full px-4 py-2 text-sm font-semibold text-charcoal-900 hover:scale-[1.03] transition-transform"
          >
            <Grid2x2 className="w-4 h-4" /> Voir les {count} photos
          </button>
        )}
      </div>

      {/* Visionneuse plein écran */}
      {open &&
        viewerIndex !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] bg-charcoal-950/95 flex flex-col" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 text-white">
            <span className="text-sm text-white/70">
              {viewerIndex + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setViewerIndex(null)}
              aria-label="Fermer"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16" onClick={() => setViewerIndex(null)}>
            <img
              src={images[viewerIndex]}
              alt={title}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(-1); }}
                  aria-label="Précédente"
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(1); }}
                  aria-label="Suivante"
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {count > 1 && (
            <div className="px-4 sm:px-6 py-4 flex flex-wrap justify-center gap-2 max-h-28 overflow-y-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setViewerIndex(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    i === viewerIndex ? 'border-white' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          </div>,
          document.body
        )}
    </>
  );
}
