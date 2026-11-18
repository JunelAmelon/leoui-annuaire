/**
 * Icônes illustrées des éléments de salle — PNG Flaticon téléchargés en local.
 * Dossier : public/animations/ — zéro dépendance réseau.
 */

import type { RoomItemType } from '../domain/types';
import type { ReactNode } from 'react';

const E = ({ name, alt }: { name: string; alt: string }) => (
  <img src={`/animations/${name}.png`} alt={alt} className="w-10 h-10 object-contain" draggable={false} />
);

export const ITEM_ICONS: Record<RoomItemType, ReactNode> = {
  /** Table d'honneur */
  stage: <E name="table%20d'honneur" alt="Table d'honneur" />,
  /** Piste de danse */
  dancefloor: <E name="piste%20de%20dance" alt="Piste de danse" />,
  /** DJ / Orchestre */
  dj: <E name="dj" alt="DJ / Orchestre" />,
  /** Buffet (fichier catering) */
  buffet: <E name="catering%20(1)" alt="Buffet" />,
  /** Bar */
  bar: <E name="bar" alt="Bar" />,
  /** Entrée */
  entrance: <E name="entr%C3%A9e" alt="Entrée" />,
  /** Photobooth */
  photobooth: <E name="photoboot" alt="Photobooth" />,
};

/** Taille adaptée pour le canvas SVG (via foreignObject) */
export const ITEM_ICON_SMALL = (type: RoomItemType) => (
  <img
    src={`/animations/${{
      stage: "table%20d'honneur",
      dancefloor: 'piste%20de%20dance',
      dj: 'dj',
      buffet: 'catering%20(1)',
      bar: 'bar',
      entrance: 'entr%C3%A9e',
      photobooth: 'photoboot',
    }[type]}.png`}
    alt={type}
    style={{ width: 28, height: 28, objectFit: 'contain' }}
    draggable={false}
  />
);
