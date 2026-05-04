# Design System Leoui - Harmonisation UI

## Vue d'ensemble

Ce document définit le design system unifié pour garantir une cohérence visuelle entre le site public, l'espace client et l'espace prestataire.

## Palette de couleurs

### Couleurs primaires

| Token | Valeur | Utilisation |
|-------|--------|-------------|
| `rose-600` | `#e11d48` | Boutons CTA principaux |
| `rose-700` | `#be123c` | Hover boutons CTA |
| `rose-500` | `#f43f5e` | Accents, favoris actifs |
| `rose-50` | `#fff1f2` | Fonds de badges promo |

### Couleurs neutres

| Token | Valeur | Utilisation |
|-------|--------|-------------|
| `charcoal-900` | `#1a1a1a` | Titres, texte principal |
| `charcoal-700` | `#374151` | Texte secondaire |
| `charcoal-500` | `#6b7280` | Texte tertiaire |
| `charcoal-400` | `#9ca3af` | Placeholders |
| `charcoal-100` | `#e5e7eb` | Bordures légères |
| `charcoal-50` | `#f9fafb` | Fonds de sections |

### Couleurs de tiers (Abonnements)

| Tier | Background | Texte | Bordure |
|------|------------|-------|---------|
| Elite | `amber-100` (#fef3c7) | `amber-700` (#b45309) | `amber-200` (#fde68a) |
| Pro | `blue-100` (#dbeafe) | `blue-700` (#1d4ed8) | `blue-200` (#bfdbfe) |
| Starter | `stone-100` (#f5f5f4) | `stone-600` (#57534e) | `stone-200` (#e7e5e4) |
| Free | Aucun | - | - |

## Typographie

### Police principale

- **Titre**: `font-serif` (Georgia, Times New Roman, serif)
- **Corps**: Système (Inter, -apple-system, sans-serif)

### Échelle typographique

| Élément | Taille | Poids | Line-height |
|---------|--------|-------|-------------|
| H1 Page | `text-3xl` (1.875rem) | font-light (300) | leading-tight |
| H2 Section | `text-2xl` (1.5rem) | font-light (300) | leading-tight |
| H3 Card | `text-lg` (1.125rem) | normal (400) | leading-tight |
| Body | `text-sm` (0.875rem) | normal (400) | leading-relaxed |
| Caption | `text-xs` (0.75rem) | medium (500) | normal |

## Composants

### VendorCard

#### Variantes

**Default (site public)**
- Bordure: `border border-charcoal-100`
- Hover: `hover:shadow-lg`
- Border-radius: aucun (`rounded-none`)
- Image: aspect-[4/3]
- CTA: full-width, `bg-rose-600`, `rounded-none`

**Compact (grille client)**
- Border-radius: `rounded-2xl`
- Overlay gradient sur l'image
- Texte blanc sur l'image
- Pas de bordure visible

**Horizontal (liste client)**
- Flex row sur desktop
- Image à gauche (44% width)
- Border-radius: `rounded-2xl`
- Shadow: `shadow-sm`

#### Structure commune

```
┌─────────────────────────────────────┐
│ Image (aspect-[4/3])                │
│ [Badge Favori - hover]              │
├─────────────────────────────────────┤
│ Titre (font-serif)                  │
│ Rating · Location                     │
│ [Badge Tier]                        │
│ Description (line-clamp-2)          │
│ Prix · [Promo]                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Voir le profil (CTA rose-600)   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Boutons CTA

#### Bouton primaire "Voir le profil"

**Site public & Espace client unifiés:**

```css
/* Base */
background-color: #e11d48; /* rose-600 */
color: white;
padding: 0.75rem 1rem; /* py-3 px-4 */
font-weight: 500;
text-align: center;
transition: background-color 200ms;

/* Hover */
background-color: #be123c; /* rose-700 */

/* Variantes */
.variant-default: rounded-none; /* site public */
.variant-client: rounded-xl;     /* espace client */
```

**Avant/Après harmonisation:**

| Contexte | Avant | Après |
|----------|-------|-------|
| Site public | rose-600, rounded-none | ✅ Identique |
| Espace client | charcoal-900, rounded-xl | ✅ rose-600 |

### Badges de Formule

#### Badge Elite

```
background: #fef3c7;  /* amber-100 */
color: #b45309;       /* amber-700 */
border: 1px solid #fde68a; /* amber-200 */
border-radius: 0.5rem; /* rounded-lg */
padding: 0.25rem 0.5rem; /* px-2 py-1 */
font-size: 0.75rem;   /* text-xs */
icon: Crown (lucide)
```

#### Badge Pro

```
background: #dbeafe;  /* blue-100 */
color: #1d4ed8;       /* blue-700 */
border: 1px solid #bfdbfe; /* blue-200 */
icon: Award (lucide)
```

#### Badge Starter

```
background: #f5f5f4;  /* stone-100 */
color: #57534e;       /* stone-600 */
border: 1px solid #e7e5e4; /* stone-200 */
icon: BadgeCheck (lucide)
```

## Espacements

### Grid layouts

**Grille 4 colonnes (featured)**
```css
display: grid;
grid-template-columns: repeat(1, 1fr); /* mobile */
gap: 1.25rem; /* gap-5 */

@media (min-width: 640px) {
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 1024px) {
  grid-template-columns: repeat(4, 1fr);
}
```

**Grille 3 colonnes (client)**
```css
display: grid;
grid-template-columns: repeat(2, 1fr); /* mobile */
gap: 0.75rem; /* gap-3 */

@media (min-width: 768px) {
  grid-template-columns: repeat(3, 1fr);
}
```

### Padding standards

| Contexte | Padding |
|----------|---------|
| Card content | `p-4` (1rem) |
| Card compact | `p-0` (image only) |
| Horizontal card | `p-5` (1.25rem) |
| Section | `py-12` (3rem) |

## Effets & Transitions

### Hover states

| Élément | Transition | Effet |
|---------|------------|-------|
| Card | `duration-300` | `shadow-lg` |
| Card image | `duration-500` | `scale-105` |
| Button | `duration-200` | `bg-rose-700` |
| Link | `duration-200` | `text-rose-600` |

### Shadows

| Token | Valeur | Utilisation |
|-------|--------|-------------|
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Cards horizontales |
| `shadow-md` (hover) | 0 4px 6px rgba(0,0,0,0.1) | Cards hover |
| `shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) | Modals, dropdowns |

## Composants partagés

### VendorCardUnified

Utilisé dans:
- `src/components/VendorCardUnified.tsx` (composant unifié)
- `src/components/HomeFeaturedVendors.tsx` (site public)
- `src/app/espace-client/prestataires/page.tsx` (espace client)

Props:
```typescript
interface VendorCardUnifiedProps {
  id: string;
  name: string;
  category: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl: string;
  images?: string[];
  startingPrice?: string;
  subscriptionTier?: SubscriptionTier;
  description?: string;
  hasPromo?: boolean;
  hrefBase?: string;
  variant?: 'default' | 'compact' | 'horizontal';
  showFavorite?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}
```

## Règles de cohérence

### 1. Boutons CTA

Tous les boutons "Voir le profil" doivent utiliser:
- ✅ Couleur: `rose-600` / `rose-700` (hover)
- ✅ Poids: `font-medium`
- ✅ Alignement: `text-center`

### 2. Badges de formule

Tous les badges de formule doivent:
- ✅ Avoir une icône à gauche
- ✅ Utiliser les couleurs définies par tier
- ✅ Être positionnés sous la note/emplacement
- ✅ Ne pas afficher pour les Free

### 3. Cards

Toutes les cards de prestataire doivent:
- ✅ Utiliser le même composant de base (VendorCardUnified)
- ✅ Avoir le même ratio d'image
- ✅ Afficher les mêmes informations (nom, catégorie, note, prix)
- ✅ Avoir la même hiérarchie visuelle

### 4. Navigation

La navigation entre espaces doit:
- ✅ Utiliser les mêmes patterns de hover
- ✅ Garder une cohérence typographique
- ✅ Préserver la reconnaissance de marque

## Migration checklist

### ✅ Terminé
- [x] Créer VendorCardUnified avec badges de formule
- [x] Mettre à jour HomeFeaturedVendors avec API + scoring
- [x] Mettre à jour espace client avec VendorCardUnified
- [x] Harmoniser les couleurs des boutons CTA
- [x] Documenter le système

### 📋 À faire
- [ ] Mettre à jour les pages de détail prestataire
- [ ] Harmoniser la navigation entre espaces
- [ ] Créer un Storybook pour les composants
- [ ] Audit de tous les boutons CTA existants

## Exemples de code

### Utilisation de VendorCardUnified

```tsx
// Mode grille compact (client)
<VendorCardUnified
  id={vendor.id}
  name={vendor.name}
  category={vendor.category}
  rating={vendor.rating}
  subscriptionTier={vendor.subscriptionTier}
  variant="compact"
  hrefBase="/espace-client/prestataires"
  showFavorite
  isFavorite={favorites.has(vendor.id)}
  onFavoriteToggle={(id) => toggleFavorite(id)}
/>

// Mode liste horizontal (client)
<VendorCardUnified
  {...vendor}
  variant="horizontal"
  hrefBase="/espace-client/prestataires"
/>

// Mode default (site public)
<VendorCardUnified
  {...vendor}
  variant="default"
  hrefBase="/vendors"
/>
```

### Style personnalisé d'un badge

```tsx
const getTierBadgeStyles = (tier: SubscriptionTier) => {
  switch (tier) {
    case 'elite':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'pro':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'starter':
      return 'bg-stone-100 text-stone-600 border-stone-200';
    default:
      return 'bg-gray-100 text-gray-500 border-gray-200';
  }
};
```

## Références

- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors)
- [Lucide Icons](https://lucide.dev/)
- [Vendor Ranking System](./VENDOR_RANKING.md)
