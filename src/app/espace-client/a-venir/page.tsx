'use client';

/**
 * Fonctionnalités à venir — présentées comme un sommaire de magazine :
 * grand visuel, numéro en filigrane, texte aéré, alternance gauche/droite.
 * Les « favoris » sont mémorisés sur cet appareil (localStorage) — rien n'est envoyé à l'équipe,
 * le texte de l'interface le dit clairement.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { UPCOMING_FEATURES, FEATURE_CATEGORIES, type FeatureCategory } from '@/lib/upcoming-features';

const STORAGE_KEY = 'leoui_upcoming_votes';

export default function UpcomingFeaturesPage() {
  const [category, setCategory] = useState<FeatureCategory>('all');
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch { /* localStorage indisponible */ }
  }, []);

  const toggle = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  const features = category === 'all' ? UPCOMING_FEATURES : UPCOMING_FEATURES.filter((f) => f.categoryKey === category);
  const cats = FEATURE_CATEGORIES.filter((c) => c.key === 'all' || UPCOMING_FEATURES.some((f) => f.categoryKey === c.key));

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* ── Ouverture ── */}
      <header className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14 items-end pb-10 border-b border-charcoal-200/70">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">La suite · {UPCOMING_FEATURES.length} outils en préparation</p>
          <h1 className="font-serif text-charcoal-900 mt-4 leading-[1.05]" style={{ fontSize: 'clamp(2.3rem, 5vw, 4rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Ce que nous<br />préparons pour vous
          </h1>
        </div>
        <div className="lg:pb-2">
          <p className="text-[15px] text-charcoal-600 leading-relaxed max-w-md">
            Livrets, démarches, voyage de noces… voici les prochains outils de votre espace.
            Gardez de côté ceux qui vous parlent : vos favoris restent sur cet appareil.
          </p>
          <p className="text-xs text-charcoal-400 mt-3">
            {saved.length === 0 ? 'Aucun favori pour l’instant' : `${saved.length} favori${saved.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      {/* ── Rubriques : simple texte, trait sous l'actif ── */}
      <nav className="flex gap-x-7 gap-y-2 flex-wrap py-5 border-b border-charcoal-100" aria-label="Rubriques">
        {cats.map((c) => (
          <button key={c.key} type="button" onClick={() => setCategory(c.key)}
            className={`pb-1.5 text-[13px] border-b-2 transition-colors ${
              category === c.key ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'
            }`}>
            {c.label}
          </button>
        ))}
      </nav>

      {/* ── Sommaire ── */}
      <div>
        {features.map((f, idx) => {
          const isSaved = saved.includes(f.id);
          const flip = idx % 2 === 1;
          return (
            <article key={f.id} className="grid md:grid-cols-2 gap-6 md:gap-14 py-10 md:py-14 border-b border-charcoal-100 last:border-b-0 items-center">
              <div className={`relative overflow-hidden aspect-[5/4] bg-stone-200 ${flip ? 'md:order-2' : ''}`}>
                <img src={f.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover saturate-[0.85]" style={{ objectPosition: f.focus }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <span className="absolute left-5 bottom-3 font-serif text-white/90 leading-none select-none" style={{ fontSize: 'clamp(3.4rem, 7vw, 5.5rem)', fontWeight: 300 }}>
                  {String(f.order).padStart(2, '0')}
                </span>
              </div>

              <div className={flip ? 'md:order-1 md:pr-4' : 'md:pl-4'}>
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-charcoal-400">{f.category}</p>
                <h2 className="font-serif text-charcoal-900 mt-3 leading-[1.15]" style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.3rem)', fontWeight: 400 }}>
                  {f.title}
                </h2>
                <p className="text-[15px] text-charcoal-600 leading-relaxed mt-4">{f.description}</p>
                <p className="font-serif italic text-charcoal-700 text-[1.05rem] leading-relaxed mt-5 pl-4 border-l border-rose-300">{f.keyBenefit}</p>

                <dl className="mt-6">
                  <dt className="text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">Ce que vous recevez</dt>
                  <dd className="text-sm text-charcoal-800 mt-1">{f.formatOrDeliverable}</dd>
                </dl>

                <div className="mt-7 flex items-center gap-5">
                  <button type="button" onClick={() => toggle(f.id)} aria-pressed={isSaved}
                    className={`inline-flex items-center gap-2 h-10 px-4 text-[13px] font-medium border transition-colors rounded-sm ${
                      isSaved ? 'bg-charcoal-900 border-charcoal-900 text-white' : 'border-charcoal-300 text-charcoal-800 hover:border-charcoal-900'
                    }`}>
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
                    {isSaved ? 'Dans vos favoris' : 'Garder de côté'}
                  </button>
                  <span className="text-[11px] tracking-wide uppercase text-rose-600 font-medium">{f.badge}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Fermeture ── */}
      <footer className="mt-4 grid md:grid-cols-[1fr_auto] gap-6 items-center bg-charcoal-900 text-white px-7 py-8 sm:px-10 sm:py-10">
        <div>
          <p className="font-serif text-2xl leading-snug" style={{ fontWeight: 400 }}>Un besoin précis pour votre mariage ?</p>
          <p className="text-sm text-white/60 mt-2 max-w-xl leading-relaxed">
            Dites-le à votre wedding planner via la messagerie : vos demandes orientent l’ordre dans lequel nous livrons ces outils.
          </p>
        </div>
        <Link href="/espace-client/messages"
          className="inline-flex items-center justify-center h-11 px-6 bg-white text-charcoal-900 text-[13px] font-medium hover:bg-rose-50 transition-colors rounded-sm">
          Écrire à mon wedding planner
        </Link>
      </footer>
    </div>
  );
}
