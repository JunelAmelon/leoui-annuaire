/**
 * Icônes illustrées des éléments de salle — set Fluent Emoji (via Iconify),
 * SVG téléchargés en local dans public/seating-icons/ : zéro dépendance réseau.
 */

import type { RoomItemType } from '../domain/types';
import type { ReactNode } from 'react';

const E = ({ name, alt }: { name: string; alt: string }) => (
  <img src={`/seating-icons/${name}.svg`} alt={alt} className="w-10 h-10" draggable={false} />
);

export const ITEM_ICONS: Record<RoomItemType, ReactNode> = {
  stage: <E name="wedding" alt="Table d'honneur" />,
  dancefloor: <E name="mirror-ball" alt="Piste de danse" />,
  dj: <E name="level-slider" alt="DJ / Orchestre" />,
  buffet: <E name="shallow-pan-of-food" alt="Buffet" />,
  bar: <E name="cocktail-glass" alt="Bar" />,
  entrance: <E name="door" alt="Entrée" />,
  photobooth: <E name="selfie" alt="Photobooth" />,
};
