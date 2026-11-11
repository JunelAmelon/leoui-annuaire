/**
 * Géométrie pure de la salle — aucune dépendance (ni Firebase, ni React, ni Three).
 * Unités : le plan 2D et la 3D partagent le même repère. 1 mètre = UNITS_PER_M unités plan.
 * Origine en haut à gauche de la salle, y vers le bas (repère SVG).
 */

import { DEFAULT_ROOM, ROOM_LIMITS } from './types';
import type { RoomConfig } from './types';

export const UNITS_PER_M = 50;

/** Dimensions d'une table en unités plan (rond = diamètre, sinon rectangle). */
export const TABLE_W = 150;
export const TABLE_H = 60;
export const ROUND_R = 42;
export const tableSizeUnits = (shape: string) =>
  shape === 'round' ? { w: ROUND_R * 2, h: ROUND_R * 2 } : { w: TABLE_W, h: TABLE_H };

export interface Point { x: number; y: number }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Normalise une config (bornes + carré = largeur identique). */
export function normalizeRoom(room?: Partial<RoomConfig> | null): RoomConfig {
  const base = { ...DEFAULT_ROOM, ...(room || {}) };
  const width_m = Math.round(clamp(Number(base.width_m) || DEFAULT_ROOM.width_m, ROOM_LIMITS.min_m, ROOM_LIMITS.max_m) * 2) / 2;
  const length_m = base.shape === 'square'
    ? width_m
    : Math.round(clamp(Number(base.length_m) || DEFAULT_ROOM.length_m, ROOM_LIMITS.min_m, ROOM_LIMITS.max_m) * 2) / 2;
  return { shape: base.shape, width_m, length_m };
}

/** Contour de la salle en mètres (sens horaire en repère SVG). */
export function roomPolygonMeters(room: RoomConfig): Point[] {
  const { width_m: w, length_m: l } = normalizeRoom(room);
  switch (room.shape) {
    case 'l':
      return [{ x: 0, y: 0 }, { x: w * 0.55, y: 0 }, { x: w * 0.55, y: l * 0.45 }, { x: w, y: l * 0.45 }, { x: w, y: l }, { x: 0, y: l }];
    case 'u':
      return [{ x: 0, y: 0 }, { x: w * 0.3, y: 0 }, { x: w * 0.3, y: l * 0.55 }, { x: w * 0.7, y: l * 0.55 }, { x: w * 0.7, y: 0 }, { x: w, y: 0 }, { x: w, y: l }, { x: 0, y: l }];
    case 't':
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: l * 0.4 }, { x: w * 0.65, y: l * 0.4 }, { x: w * 0.65, y: l }, { x: w * 0.35, y: l }, { x: w * 0.35, y: l * 0.4 }, { x: 0, y: l * 0.4 }];
    case 'oval': {
      const n = 56;
      return Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return { x: w / 2 + (Math.cos(a) * w) / 2, y: l / 2 + (Math.sin(a) * l) / 2 };
      });
    }
    default:
      return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: l }, { x: 0, y: l }];
  }
}

/** Contour en unités plan. */
export function roomPolygon(room: RoomConfig): Point[] {
  return roomPolygonMeters(room).map((p) => ({ x: p.x * UNITS_PER_M, y: p.y * UNITS_PER_M }));
}

/** Surface d'un polygone (formule de Gauss) — mètres² si le polygone est en mètres. */
export function polygonArea(poly: Point[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Taille de la boîte englobante en unités plan. */
export function roomSizeUnits(room?: Partial<RoomConfig> | null): { w: number; h: number } {
  const r = normalizeRoom(room);
  return { w: r.width_m * UNITS_PER_M, h: r.length_m * UNITS_PER_M };
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Point inséré dans le polygone avec une marge de `margin` unités autour (test 4 directions). */
export function isInsideWithMargin(p: Point, poly: Point[], margin: number): boolean {
  return (
    pointInPolygon(p, poly) &&
    pointInPolygon({ x: p.x + margin, y: p.y }, poly) &&
    pointInPolygon({ x: p.x - margin, y: p.y }, poly) &&
    pointInPolygon({ x: p.x, y: p.y + margin }, poly) &&
    pointInPolygon({ x: p.x, y: p.y - margin }, poly)
  );
}

/** Point « sûr » à l'intérieur (le point de grille intérieur le plus proche du centre de masse). */
export function innerAnchor(poly: Point[]): Point {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const step = Math.max(10, Math.min(maxX - minX, maxY - minY) / 40);
  const inside: Point[] = [];
  for (let x = minX + step / 2; x < maxX; x += step)
    for (let y = minY + step / 2; y < maxY; y += step) if (pointInPolygon({ x, y }, poly)) inside.push({ x, y });
  if (!inside.length) return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const mean = { x: inside.reduce((s, p) => s + p.x, 0) / inside.length, y: inside.reduce((s, p) => s + p.y, 0) / inside.length };
  return inside.reduce((best, p) => (Math.hypot(p.x - mean.x, p.y - mean.y) < Math.hypot(best.x - mean.x, best.y - mean.y) ? p : best));
}

/**
 * Ramène un point dans la salle : si dehors, on le glisse vers l'ancre intérieure
 * jusqu'à ce qu'il soit dedans (marge incluse si possible).
 */
export function nudgeInside(p: Point, poly: Point[], margin = 20): Point {
  if (isInsideWithMargin(p, poly, margin)) return p;
  const a = innerAnchor(poly);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const q = { x: p.x + (a.x - p.x) * t, y: p.y + (a.y - p.y) * t };
    if (isInsideWithMargin(q, poly, margin)) return q;
  }
  return a;
}

/**
 * Emplacements de tables dans la salle : grille de pas (sx, sy), centres situés
 * à l'intérieur avec marge, hors des zones `avoid` (rectangles x,y,w,h). Triés lignes puis colonnes.
 */
export function gridSlots(
  poly: Point[],
  spacing: { x: number; y: number },
  margin: number,
  avoid: { x: number; y: number; w: number; h: number }[] = []
): Point[] {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const cols = Math.max(1, Math.floor((maxX - minX) / spacing.x));
  const rows = Math.max(1, Math.floor((maxY - minY) / spacing.y));
  const offX = minX + (maxX - minX - (cols - 1) * spacing.x) / 2;
  const offY = minY + (maxY - minY - (rows - 1) * spacing.y) / 2;
  const slots: Point[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const p = { x: offX + c * spacing.x, y: offY + r * spacing.y };
      if (!isInsideWithMargin(p, poly, margin)) continue;
      if (avoid.some((z) => p.x > z.x - margin && p.x < z.x + z.w + margin && p.y > z.y - margin && p.y < z.y + z.h + margin)) continue;
      slots.push(p);
    }
  return slots;
}
