export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'elite';

export interface PlanConfig {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  price: number;
  tierWeight: number;
  badgeLabel: string;
  badgeClasses: string;
  accentClass: string;
  features: string[];
  popular?: boolean;
}

export const PAID_PLANS: PlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Être trouvé',
    price: 39,
    tierWeight: 100,
    badgeLabel: 'Profil vérifié',
    badgeClasses: 'bg-stone-100 text-stone-700 border-stone-200',
    accentClass: 'border-stone-300',
    features: [
      'Accès complet à l\'espace prestataire',
      'Profil, photos et offres dans l\'annuaire',
      'Badge "Profil vérifié" visible',
      'Statistiques de base (vues / clics)',
      'Réception des demandes clients',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Recevoir plus de demandes',
    price: 89,
    tierWeight: 500,
    badgeLabel: 'Recommandé',
    badgeClasses: 'bg-blue-100 text-blue-700 border-blue-200',
    accentClass: 'border-blue-500',
    features: [
      'Tout du plan Starter',
      'Badge "Recommandé" visible sur votre profil',
      'Positionnement prioritaire dans les résultats',
      'Statistiques avancées (leads, taux de réponse)',
      'Mise en avant dans votre catégorie et région',
    ],
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    tagline: 'Être en tête',
    price: 149,
    tierWeight: 1000,
    badgeLabel: 'Top Prestataire',
    badgeClasses: 'bg-amber-100 text-amber-700 border-amber-200',
    accentClass: 'border-amber-500',
    features: [
      'Tout du plan Pro',
      'Badge "Top Prestataire" premium',
      'Position maximale garantie en tête des résultats',
      'Visibilité sur la page d\'accueil LeOui.net',
      'Support prioritaire dédié',
    ],
  },
];

export const TIER_WEIGHTS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 100,
  pro: 500,
  elite: 1000,
};

export const TIER_BADGE: Record<SubscriptionTier, { label: string; classes: string } | null> = {
  free: null,
  starter: { label: 'Profil vérifié', classes: 'bg-stone-100 text-stone-600 border border-stone-200' },
  pro: { label: 'Recommandé', classes: 'bg-blue-100 text-blue-700 border border-blue-200' },
  elite: { label: 'Top Prestataire', classes: 'bg-amber-100 text-amber-700 border border-amber-200' },
};

export function computeVendorScore(vendor: any): number {
  const tier = (vendor.subscriptionTier || 'free') as SubscriptionTier;
  const tierWeight = TIER_WEIGHTS[tier] ?? 0;
  const rating = Number(vendor.rating || 0) * 20;
  const reviews = Math.min(Number(vendor.reviewCount || 0), 100);
  const weddings = Math.min(Number(vendor.weddingsCompleted || 0) * 0.5, 50);
  return tierWeight + Math.round(rating + reviews + weddings);
}

export function getPlanById(id: SubscriptionTier): PlanConfig | null {
  return PAID_PLANS.find(p => p.id === id) || null;
}
