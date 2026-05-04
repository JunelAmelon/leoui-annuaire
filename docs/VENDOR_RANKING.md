# Système de Ranking des Prestataires

## Vue d'ensemble

Le système de ranking classe automatiquement les prestataires selon leur formule d'abonnement et leur performance globale. Ce système garantit une visibilité accrue aux prestataires premium tout en maintenant une UX crédible.

## Algorithme de Scoring

### Formule de calcul

```typescript
vendorScore = tierWeight + bonusScore

bonusScore = (rating * 20) + min(reviews, 100) + min(weddings * 0.5, 50)
```

### Poids des Formules (TIER_WEIGHTS)

| Formule | Poids | Description |
|---------|-------|-------------|
| **Elite** | 1000 | Visibilité maximale, badge or |
| **Pro** | 500 | Haute priorité, badge bleu |
| **Starter** | 100 | Priorité standard, badge gris |
| **Free** | 0 | Visible mais classé en dernier |

### Facteurs de Bonus

| Facteur | Multiplicateur | Plafond |
|---------|---------------|---------|
| Note | × 20 | 100 pts (note 5.0) |
| Nombre d'avis | +1 par avis | 100 pts |
| Mariages réalisés | +0.5 par mariage | 50 pts (100 mariages) |

## Exemples de Scores

### Prestataire Elite
- Formule Elite: 1000 pts
- Note 4.8: 96 pts
- 50 avis: 50 pts
- 30 mariages: 15 pts
- **Total: 1161 pts**

### Prestataire Pro
- Formule Pro: 500 pts
- Note 4.5: 90 pts
- 25 avis: 25 pts
- 10 mariages: 5 pts
- **Total: 620 pts**

### Prestataire Free
- Formule Free: 0 pt
- Note 5.0: 100 pts
- 200 avis: 100 pts (plafonné)
- 150 mariages: 50 pts (plafonné)
- **Total: 250 pts**

> **Note**: Même avec une excellente performance, un prestataire Free ne peut pas dépasser un Starter de base (100 pts) car le poids de la formule prime.

## Architecture Technique

### Fichiers clés

- `src/lib/subscription-plans.ts` - Logique de scoring et poids
- `src/app/api/public/vendors/route.ts` - API avec tri intégré
- `src/components/VendorCardUnified.tsx` - Composant de carte avec badges

### Implémentation

```typescript
// src/lib/subscription-plans.ts
export function computeVendorScore(vendor: any): number {
  const tier = (vendor.subscriptionTier || 'free') as SubscriptionTier;
  const tierWeight = TIER_WEIGHTS[tier] ?? 0;
  const rating = Number(vendor.rating || 0) * 20;
  const reviews = Math.min(Number(vendor.reviewCount || 0), 100);
  const weddings = Math.min(Number(vendor.weddingsCompleted || 0) * 0.5, 50);
  return tierWeight + Math.round(rating + reviews + weddings);
}
```

### API Route

```typescript
// src/app/api/public/vendors/route.ts
const vendors = rawVendors
  .map((v: any) => ({ ...v, vendorScore: computeVendorScore(v) }))
  .sort((a: any, b: any) => b.vendorScore - a.vendorScore);
```

## Badges de Formule

### Design des Badges

| Formule | Label | Couleur | Icône |
|---------|-------|---------|-------|
| Elite | "Prestige" | Or (amber-100/text-amber-700) | Crown |
| Pro | "Partenaire" | Bleu (blue-100/text-blue-700) | Award |
| Starter | "Membre" | Gris (stone-100/text-stone-600) | BadgeCheck |
| Free | Aucun | - | - |

### Positionnement

- Badge affiché sous la note/emplacement
- Taille: text-xs, padding px-2 py-1
- Bordure subtile pour délimiter
- Icône à gauche du label

## Considérations UX

### Pourquoi les Free restent visibles ?

1. **Crédibilité**: Un directory 100% payant paraît artificiel
2. **Découverte**: Les couples peuvent trouver des pépites
3. **Conversion funnel**: Incite les Free à upgrader en voyant les Pro/Elite
4. **SEO**: Plus de contenu = meilleur référencement

### Transparence

- Les badges montrent clairement le niveau d'engagement
- Pas de "cachotterie" sur le classement
- Les utilisateurs comprennent la valeur premium

## Migration depuis l'ancien système

### Mapping des anciens tiers

| Ancien | Nouveau | Action requise |
|--------|---------|----------------|
| premium | elite | Migration auto |
| standard | pro | Migration auto |
| basic | starter | Migration auto |
| free | free | Inchangé |

### Script de migration

```typescript
const TIER_MAPPING: Record<string, SubscriptionTier> = {
  premium: 'elite',
  standard: 'pro', 
  basic: 'starter',
  free: 'free',
};
```

## Monitoring

### Métriques à suivre

- **CTR par formule**: Les Elite/Pro ont-ils plus de clics ?
- **Taux de conversion Free → Payant**
- **Satisfaction utilisateur**: Les couples trouvent-ils facilement ?
- **Nombre de prestataires par tier**

### Ajustements futurs

L'algorithme est conçu pour être ajustable:
- Modifier les TIER_WEIGHTS
- Ajuster les plafonds de bonus
- Ajouter de nouveaux facteurs (temps de réponse, complétude du profil)

## Roadmap

### Phase 1 (Actuel) ✅
- Ranking par formule + note + avis
- Badges visuels
- Harmonisation UI

### Phase 2 (Futur)
- Poids dynamique selon saisonnalité
- A/B testing des poids
- Ranking personnalisé par utilisateur
- Filtres par formule
