/**
 * Icônes illustrées des éléments de salle — set Fluent Emoji Flat (via Iconify API).
 * SVG locaux dans public/seating-icons/ — zéro dépendance réseau.
 * Style : plat et coloré, proche Flaticon.
 */

import type { RoomItemType } from '../domain/types';
import type { ReactNode } from 'react';

const E = ({ name, alt }: { name: string; alt: string }) => (
  <img src={`/seating-icons/${name}.svg`} alt={alt} className="w-10 h-10" draggable={false} />
);

export const ITEM_ICONS: Record<RoomItemType, ReactNode> = {
  /** Chapelle / arche de mariage → table des mariés */
  stage: <E name="wedding" alt="Table d'honneur" />,
  /** Boule disco */
  dancefloor: <E name="mirror-ball" alt="Piste de danse" />,
  /** Casque DJ */
  dj: <E name="headphone" alt="DJ / Orchestre" />,
  /** Assiette couverts */
  buffet: <E name="fork-and-knife-with-plate" alt="Buffet" />,
  /** Verre cocktail */
  bar: <E name="cocktail-glass" alt="Bar" />,
  /** Porte */
  entrance: <E name="door" alt="Entrée" />,
  /** Appareil photo avec flash */
  photobooth: <E name="camera-with-flash" alt="Photobooth" />,
};

/** Taille adaptée pour le canvas SVG (via foreignObject) */
export const ITEM_ICON_SMALL = (type: RoomItemType) => (
  <img src={`/seating-icons/${{
    stage: 'wedding', dancefloor: 'mirror-ball', dj: 'headphone',
    buffet: 'fork-and-knife-with-plate', bar: 'cocktail-glass',
    entrance: 'door', photobooth: 'camera-with-flash',
  }[type]}.svg`} alt={type} style={{ width: 28, height: 28 }} draggable={false} />
);
