'use client';

/**
 * Rangée « Déjà un compte LeOui.net ? » — compacte, entièrement cliquable.
 * Utilisée sur /market/connexion et /market/inscription :
 * ouvre le modal de connexion LeOui.net sans quitter la page.
 */

import { useState } from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import LeOuiNetModal from './LeOuiNetModal';

export default function LeOuiNetEntryCard() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <LeOuiNetModal onClose={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full mb-6 flex items-center gap-3 border border-charcoal-200 hover:border-rose-400 bg-white px-4 py-3 text-left transition-colors"
      >
        <Heart className="w-4 h-4 text-rose-600 fill-rose-600 flex-shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-charcoal-900 leading-tight">
            Déjà un compte LeOui.net ?
          </span>
          <span className="block text-xs text-charcoal-500 mt-0.5 leading-snug">
            Accéder à mon espace Market avec les mêmes identifiants.
          </span>
        </span>
        <ArrowRight className="w-4 h-4 text-charcoal-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </button>
    </>
  );
}
