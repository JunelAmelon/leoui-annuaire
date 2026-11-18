import { Brush, Camera, Car, Church, Music, Package, Sparkles, UtensilsCrossed, Wine, type LucideIcon } from 'lucide-react';
import type { TimelineCategory } from '../domain/types';

/** Pictogrammes sobres (traits fins) par catégorie : couche UI, le domaine reste sans dépendance graphique. */
export const CATEGORY_ICONS: Record<TimelineCategory, LucideIcon> = {
  preparation: Brush,
  ceremony: Church,
  photo: Camera,
  cocktail: Wine,
  meal: UtensilsCrossed,
  party: Music,
  transport: Car,
  logistics: Package,
  other: Sparkles,
};
