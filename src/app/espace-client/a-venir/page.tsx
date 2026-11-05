'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gamepad2,
  HeartHandshake,
  Church,
  Compass,
  Landmark,
  MailCheck,
  Bed,
  Wine,
  Sparkles,
  Check,
  Bell,
  MessageSquare,
  FileText,
} from 'lucide-react';
import {
  UPCOMING_FEATURES,
  FEATURE_CATEGORIES,
  type UpcomingFeature,
  type FeatureCategory,
} from '@/lib/upcoming-features';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Gamepad2,
  HeartHandshake,
  Church,
  Compass,
  Landmark,
  MailCheck,
  Bed,
  Wine,
};

export default function UpcomingFeaturesPage() {
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory>('all');
  const [votedIds, setVotedIds] = useState<string[]>([]);

  // Charger les votes locaux pour mémoriser l'intérêt du couple
  useEffect(() => {
    try {
      const stored = localStorage.getItem('leoui_upcoming_votes');
      if (stored) {
        setVotedIds(JSON.parse(stored));
      }
    } catch {
      // Ignorer si localStorage indisponible
    }
  }, []);

  const handleVote = (feature: UpcomingFeature) => {
    const isVoted = votedIds.includes(feature.id);
    let next: string[];
    if (isVoted) {
      next = votedIds.filter((id) => id !== feature.id);
      toast('Votre intérêt a été retiré.', { duration: 2500 });
    } else {
      next = [...votedIds, feature.id];
      toast.success(`Votre intérêt pour « ${feature.title} » a été transmis à l'équipe LeOui !`, {
        duration: 3000,
      });
    }
    setVotedIds(next);
    try {
      localStorage.setItem('leoui_upcoming_votes', JSON.stringify(next));
    } catch {
      // noop
    }
  };

  const filteredFeatures =
    selectedCategory === 'all'
      ? UPCOMING_FEATURES
      : UPCOMING_FEATURES.filter((f) => f.categoryKey === selectedCategory);

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ── En-tête de page sobre & éditorial ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/70 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <p className="text-xs uppercase tracking-widest text-charcoal-400 font-medium">
              Espace client · Nouveautés
            </p>
          </div>
          <h1
            className="font-serif text-charcoal-900 leading-tight"
            style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 400 }}
          >
            Fonctionnalités à venir
          </h1>
          <p className="text-sm text-charcoal-600 mt-2 max-w-2xl leading-relaxed">
            Découvrez les 8 prochains outils en cours de conception pour Le Oui Parfait.
            Indiquez les modules qui vous intéressent le plus afin de guider le calendrier des livraisons.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-charcoal-500 bg-white border border-stone-200/80 px-3.5 py-2 rounded-xl shadow-xs self-start sm:self-auto flex-shrink-0">
          <Sparkles className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{votedIds.length} intérêt{votedIds.length > 1 ? 's' : ''} noté{votedIds.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Filtres de catégories ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FEATURE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.key;
          const count =
            cat.key === 'all'
              ? UPCOMING_FEATURES.length
              : UPCOMING_FEATURES.filter((f) => f.categoryKey === cat.key).length;

          if (count === 0) return null;

          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
                active
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-charcoal-600 hover:text-charcoal-900 hover:border-charcoal-300'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  active ? 'bg-white/20 text-white' : 'bg-stone-100 text-charcoal-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Grille des 8 cartes ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredFeatures.map((feature) => {
          const Icon = ICON_MAP[feature.iconName] || Sparkles;
          const isVoted = votedIds.includes(feature.id);

          return (
            <div
              key={feature.id}
              className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div>
                {/* Ligne d'en-tête de carte */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-[11px] font-medium tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-stone-100 text-charcoal-600">
                    {feature.category}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    {feature.badge}
                  </span>
                </div>

                {/* Titre et icône */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-[#FAF6F8] border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0 group-hover:bg-rose-50 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif text-charcoal-900 text-lg font-normal leading-snug">
                      {feature.title}
                    </h2>
                    <p className="text-xs text-charcoal-400 mt-0.5">
                      Prévu dans la feuille de route LeOui
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-charcoal-600 leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Détail concret / Livrable */}
                <div className="rounded-xl bg-[#FAF6F8]/80 border border-stone-200/60 p-3.5 space-y-2 mb-5">
                  <div className="flex items-start gap-2 text-xs text-charcoal-700 leading-normal">
                    <span className="text-rose-500 font-bold leading-none mt-0.5">·</span>
                    <span>{feature.keyBenefit}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-200/50 text-[11px] text-charcoal-500">
                    <FileText className="w-3.5 h-3.5 text-charcoal-400 flex-shrink-0" />
                    <span className="font-medium text-charcoal-700">Livrable :</span>
                    <span className="truncate">{feature.formatOrDeliverable}</span>
                  </div>
                </div>
              </div>

              {/* Bouton de vote / intérêt */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
                <span className="text-[11px] text-charcoal-400">
                  {isVoted ? 'Priorité enregistrée' : 'Cette fonctionnalité vous intéresse ?'}
                </span>
                <button
                  type="button"
                  onClick={() => handleVote(feature)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    isVoted
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-white border border-stone-200 text-charcoal-700 hover:border-charcoal-400 hover:text-charcoal-900'
                  }`}
                >
                  {isVoted ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-rose-600" />
                      <span>Intérêt noté</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-charcoal-400" />
                      <span>M’avertir</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Encadré contact / feedback discret ── */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-serif text-charcoal-900 text-base font-normal">
            Vous avez un besoin spécifique pour votre mariage ?
          </p>
          <p className="text-xs text-charcoal-500 max-w-xl leading-relaxed">
            Faites-en part à votre agence ou wedding planner via la messagerie. Vos retours nous aident à ajuster l’ordre de déploiement des fonctionnalités.
          </p>
        </div>
        <Link
          href="/espace-client/messages"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors whitespace-nowrap shadow-xs flex-shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Écrire à votre agence</span>
        </Link>
      </div>
    </div>
  );
}

