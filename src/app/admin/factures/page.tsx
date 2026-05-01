'use client';

import Link from 'next/link';
import { Receipt, ArrowLeft } from 'lucide-react';

export default function AdminFacturesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
          Factures
        </h1>
      </div>

      <div className="relative bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
        <div className="p-8 pointer-events-none select-none opacity-55 saturate-0">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-6 h-6 text-charcoal-400" />
            </div>
            <div>
              <p className="text-charcoal-900 font-semibold">Fonctionnalité à venir</p>
              <p className="text-sm text-charcoal-500 mt-1">
                La gestion des factures côté administration arrive prochainement.
              </p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-charcoal-950/25 backdrop-blur-[1.5px]" />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md text-center rounded-2xl border border-white/60 bg-white/90 shadow-lg px-6 py-5">
            <p className="text-[0.65rem] font-semibold tracking-[0.12em] uppercase text-rose-600 mb-2">
              Bientôt disponible
            </p>
            <h2 className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 500 }}>
              Module facturation admin
            </h2>
            <p className="text-sm text-charcoal-600 mt-2 leading-relaxed">
              Cette fonctionnalité est en cours de finalisation et sera disponible très prochainement.
            </p>
          </div>
        </div>
      </div>

      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 font-medium">
        <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
      </Link>
    </div>
  );
}
