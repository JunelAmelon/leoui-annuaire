'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown, LucideIcon,
  Search, ShieldCheck, PackageCheck, Tag, Truck, HandCoins,
} from 'lucide-react';

// Icônes résolues côté client — les props RSC ne peuvent pas passer
// de fonctions/composants, on passe donc des clés string.
const STEP_ICONS: Record<string, LucideIcon> = {
  search: Search,
  shield: ShieldCheck,
  package_check: PackageCheck,
  tag: Tag,
  truck: Truck,
  coins: HandCoins,
};

export interface StepRowData {
  n: string;
  title: string;
  text: string;
  icon: keyof typeof STEP_ICONS;
}

interface HowItWorksRowProps {
  eyebrow: string;
  title: string;
  cta?: { label: string; href: string };
  steps: StepRowData[];
  image: string;
  imageAlt?: string;
  imageSide?: 'left' | 'right';
}

// Rangée « Comment ça marche » — layout référence : texte + accordéon d'étapes
// d'un côté, grande photo de l'autre. Alterner imageSide à chaque rangée.
export default function HowItWorksRow({
  eyebrow,
  title,
  cta,
  steps,
  image,
  imageAlt = '',
  imageSide = 'right',
}: HowItWorksRowProps) {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="rounded-[28px] bg-white overflow-hidden grid lg:grid-cols-2">
      {/* Texte */}
      <div className={`p-8 sm:p-12 flex flex-col order-2 ${imageSide === 'left' ? 'lg:order-2' : 'lg:order-1'}`}>
        <p className="text-[0.65rem] font-semibold tracking-[0.22em] uppercase text-charcoal-400 mb-3">
          {eyebrow}
        </p>
        <h3
          className="font-serif text-charcoal-900 mb-6"
          style={{ fontSize: 'clamp(1.7rem, 2.6vw, 2.3rem)', fontWeight: 300, lineHeight: 1.15 }}
        >
          {title}
        </h3>
        {cta && (
          <Link
            href={cta.href}
            className="inline-flex w-fit items-center gap-1.5 border border-charcoal-200 hover:border-rose-400 hover:text-rose-600 text-charcoal-700 text-xs font-semibold px-4 py-2 rounded-full transition-colors mb-8"
          >
            {cta.label}
          </Link>
        )}

        <div className="mt-auto">
          {steps.map((s, i) => {
            const open = openIdx === i;
            const Icon = STEP_ICONS[s.icon] || Tag;
            return (
              <div key={s.n} className="border-t border-charcoal-100">
                <button
                  onClick={() => setOpenIdx(open ? -1 : i)}
                  className="w-full flex items-center gap-4 py-4 text-left group"
                  aria-expanded={open}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      open ? 'bg-rose-600' : 'bg-rose-50 group-hover:bg-rose-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${open ? 'text-white' : 'text-rose-600'}`} />
                  </span>
                  <span className={`flex-1 text-sm font-semibold ${open ? 'text-charcoal-900' : 'text-charcoal-700'}`}>
                    {s.title}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-charcoal-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    open ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]'
                  }`}
                >
                  <p className="overflow-hidden pl-[3.25rem] pr-4 text-sm text-charcoal-500 leading-relaxed">
                    {s.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo — en premier sur mobile */}
      <div className={`relative min-h-[260px] lg:min-h-full order-1 ${imageSide === 'left' ? 'lg:order-1' : 'lg:order-2'}`}>
        <img src={image} alt={imageAlt} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>
  );
}
