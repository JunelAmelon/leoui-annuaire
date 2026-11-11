/**
 * Géométrie pure d'une table et de ses chaises — partagée par le plan 2D et la vue 3D
 * pour que les deux affichent exactement la même disposition.
 * Repère : unités plan (1 m = 50 unités), y vers le bas.
 */

import type { SeatingTable } from './types';
import { ROUND_R, tableSizeUnits, type Point } from './room-geometry';

/** Encombrement d'une chaise en unités plan (vue de dessus). */
export const CHAIR_W = 15;
export const CHAIR_H = 10;

export interface SeatPlacement extends Point {
  /** Rotation en degrés (sens horaire, repère SVG) : 0 = dossier vers le haut (à l'opposé de la table). */
  angle: number;
}

export function tableCenterUnits(t: SeatingTable): Point {
  const s = tableSizeUnits(t.shape);
  return { x: t.x + s.w / 2, y: t.y + s.h / 2 };
}

/**
 * Position absolue (non pivotée) et orientation de chaque chaise.
 * Le dossier est toujours du côté opposé à la table.
 */
export function seatLayout(t: SeatingTable): SeatPlacement[] {
  const c = tableCenterUnits(t);
  const { w, h } = tableSizeUnits(t.shape);
  const pts: SeatPlacement[] = [];

  if (t.shape === 'round' || t.shape === 'oval') {
    const rx = t.shape === 'round' ? ROUND_R + CHAIR_H + 2 : w / 2 + CHAIR_H + 3;
    const ry = t.shape === 'round' ? rx : h / 2 + CHAIR_H + 3;
    for (let i = 0; i < t.seats; i++) {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry, angle: (a * 180) / Math.PI + 90 });
    }
    return pts;
  }

  // Rectangulaire / table d'honneur : rangée du haut (dos vers le haut) + rangée du bas (dos vers le bas)
  const top = Math.ceil(t.seats / 2);
  const bottom = t.seats - top;
  const gap = CHAIR_H + 4;
  for (let i = 0; i < top; i++) pts.push({ x: t.x + (w * (i + 0.5)) / top, y: t.y - gap, angle: 0 });
  for (let i = 0; i < bottom; i++) pts.push({ x: t.x + (w * (i + 0.5)) / bottom, y: t.y + h + gap, angle: 180 });
  return pts;
}
