import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRoom, roomPolygon, roomSizeUnits, pointInPolygon, nudgeInside, gridSlots, innerAnchor, UNITS_PER_M,
} from './room-geometry';
import type { RoomShape } from './types';

const SHAPES: RoomShape[] = ['rect', 'square', 'l', 'u', 't', 'oval'];

test('room-geometry', async (t) => {
  await t.test('normalizeRoom borne les dimensions et force le carré', () => {
    assert.equal(normalizeRoom({ shape: 'rect', width_m: 2, length_m: 500 }).width_m, 8);
    assert.equal(normalizeRoom({ shape: 'rect', width_m: 2, length_m: 500 }).length_m, 60);
    const sq = normalizeRoom({ shape: 'square', width_m: 18, length_m: 10 });
    assert.equal(sq.length_m, 18, 'carré = longueur égale à la largeur');
    assert.deepEqual(normalizeRoom(null), { shape: 'rect', width_m: 20, length_m: 14 });
  });

  await t.test('salle par défaut = 1000×700 unités (rétro-compatibilité des anciens plans)', () => {
    assert.deepEqual(roomSizeUnits(null), { w: 20 * UNITS_PER_M, h: 14 * UNITS_PER_M });
    assert.equal(20 * UNITS_PER_M, 1000);
    assert.equal(14 * UNITS_PER_M, 700);
  });

  await t.test('chaque forme produit un contour fermé non vide dans la boîte englobante', () => {
    for (const shape of SHAPES) {
      const room = normalizeRoom({ shape, width_m: 24, length_m: 16 });
      const poly = roomPolygon(room);
      const { w, h } = roomSizeUnits(room);
      assert.ok(poly.length >= 4, shape);
      assert.ok(poly.every((p) => p.x >= -0.001 && p.x <= w + 0.001 && p.y >= -0.001 && p.y <= h + 0.001), `${shape} dans la boîte`);
      const a = innerAnchor(poly);
      assert.ok(pointInPolygon(a, poly), `${shape}: ancre intérieure`);
    }
  });

  await t.test('les échancrures de L / U / T sont bien hors de la salle', () => {
    const L = roomPolygon(normalizeRoom({ shape: 'l', width_m: 20, length_m: 20 }));
    assert.equal(pointInPolygon({ x: 18 * UNITS_PER_M, y: 2 * UNITS_PER_M }, L), false, 'coin haut-droit du L vide');
    assert.equal(pointInPolygon({ x: 2 * UNITS_PER_M, y: 2 * UNITS_PER_M }, L), true);
    const U = roomPolygon(normalizeRoom({ shape: 'u', width_m: 20, length_m: 20 }));
    assert.equal(pointInPolygon({ x: 10 * UNITS_PER_M, y: 3 * UNITS_PER_M }, U), false, 'creux du U vide');
    assert.equal(pointInPolygon({ x: 10 * UNITS_PER_M, y: 18 * UNITS_PER_M }, U), true);
    const T = roomPolygon(normalizeRoom({ shape: 't', width_m: 20, length_m: 20 }));
    assert.equal(pointInPolygon({ x: 2 * UNITS_PER_M, y: 18 * UNITS_PER_M }, T), false, 'bas-gauche du T vide');
  });

  await t.test('nudgeInside ramène un point hors salle à l\u2019intérieur', () => {
    for (const shape of SHAPES) {
      const poly = roomPolygon(normalizeRoom({ shape, width_m: 24, length_m: 16 }));
      const p = nudgeInside({ x: -300, y: -300 }, poly);
      assert.ok(pointInPolygon(p, poly), shape);
    }
    // un point déjà bon ne bouge pas
    const poly = roomPolygon(normalizeRoom(null));
    assert.deepEqual(nudgeInside({ x: 500, y: 350 }, poly), { x: 500, y: 350 });
  });

  await t.test('gridSlots ne retourne que des emplacements intérieurs et hors zones interdites', () => {
    const poly = roomPolygon(normalizeRoom({ shape: 'u', width_m: 30, length_m: 20 }));
    const avoid = [{ x: 600, y: 700, w: 300, h: 200 }];
    const slots = gridSlots(poly, { x: 150, y: 150 }, 70, avoid);
    assert.ok(slots.length > 0);
    assert.ok(slots.every((p) => pointInPolygon(p, poly)));
    assert.ok(slots.every((p) => !(p.x > 530 && p.x < 970 && p.y > 630 && p.y < 970)));
  });
});
