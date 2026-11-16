'use client';

/**
 * Fenêtre modale « image à gauche, formulaire à droite ».
 * - Desktop : volet photo à gauche (titre posé dessus), contenu défilant à droite, pied collé en bas.
 * - Mobile : plein écran, bandeau photo en haut (toujours visible), contenu dessous, pied collé.
 * Rendue dans <body> : le fond couvre toute la fenêtre et la page ne défile plus derrière.
 */

import { useEffect, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SplitModalProps {
  image: string;
  kicker: string;
  title: string;
  /** Phrase affichée sous le titre, sur la photo (desktop). */
  caption?: string;
  /** Recadrage de la photo (classe object-position). */
  imageClass?: string;
  widthClass?: string;
  onClose: () => void;
  /** Si fourni, le contenu est enveloppé dans un <form>. */
  onSubmit?: (e: FormEvent) => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function SplitModal({
  image, kicker, title, caption, imageClass = 'object-center', widthClass = 'sm:max-w-3xl', onClose, onSubmit, footer, children,
}: SplitModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const Shell = onSubmit ? 'form' : 'div';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-stretch sm:items-center justify-center bg-charcoal-950/60 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <Shell
        {...(onSubmit ? { onSubmit } : {})}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className={`bg-white w-full ${widthClass} h-[100dvh] sm:h-auto sm:max-h-[90dvh] sm:min-h-[30rem] flex flex-col sm:flex-row sm:rounded-2xl overflow-hidden shadow-2xl`}
      >
        {/* Volet photo */}
        <div className="relative flex-shrink-0 h-32 sm:h-auto sm:w-[38%] bg-charcoal-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className={`absolute inset-0 w-full h-full object-cover ${imageClass}`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors sm:hidden">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7 text-white">
            <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/70">{kicker}</p>
            <h2 className="font-serif leading-tight mt-1 text-[1.6rem] sm:text-[2rem]" style={{ fontWeight: 400, letterSpacing: '-0.01em' }}>{title}</h2>
            {caption && <p className="hidden sm:block font-serif italic text-white/80 text-[15px] leading-snug mt-3">{caption}</p>}
          </div>
        </div>

        {/* Contenu */}
        <div className="relative flex-1 min-w-0 min-h-0 flex flex-col">
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="hidden sm:flex absolute top-4 right-4 w-9 h-9 items-center justify-center text-charcoal-400 hover:text-charcoal-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain subtle-scroll px-6 sm:px-8 py-6 sm:py-8 space-y-7">{children}</div>
          {footer && (
            <div className="flex items-center gap-3 px-6 sm:px-8 py-4 border-t border-stone-200 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>
          )}
        </div>
      </Shell>
    </div>,
    document.body
  );
}

/** Styles de champs partagés : champ souligné, étiquette en petites capitales. */
export const modalField = 'w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none';
export const modalLabel = 'block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400';
export const modalGhostBtn = 'h-11 px-5 border border-stone-300 text-charcoal-700 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm';
export const modalPrimaryBtn = 'h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-35 disabled:hover:bg-charcoal-900 transition-colors rounded-sm';
