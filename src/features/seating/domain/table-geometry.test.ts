import test from 'node:test';
import assert from 'node:assert/strict';
import { seatLayout, tableCenterUnits } from './table-geometry';
import type { SeatingTable } from './types';

test('table-geometry', async (t) => {
  await t.test('table ronde : toutes les chaises à égale distance, dos à l’extérieur', () => {
    const tb: SeatingTable = { id: 't1', label: 'T1', shape: 'round', x: 400, y: 300, rotation: 0, seats: 8 };
    const c = tableCenterUnits(tb);
    const seats = seatLayout(tb);
    assert.equal(seats.length, 8);
    const d0 = Math.hypot(seats[0].x - c.x, seats[0].y - c.y);
    for (const s of seats) assert.ok(Math.abs(Math.hypot(s.x - c.x, s.y - c.y) - d0) < 0.01);
    // siège 0 est en haut (y < cy) → angle = 0 (dossier vers le haut)
    assert.equal(Math.round(seats[0].angle), 0);
  });

  await t.test('table rectangulaire : haut angle=0, bas angle=180 (chaises face à la table)', () => {
    const tb: SeatingTable = { id: 't2', label: 'T2', shape: 'rect', x: 200, y: 200, rotation: 0, seats: 6 };
    const seats = seatLayout(tb);
    assert.equal(seats.filter((s) => s.angle === 0).length, 3);
    assert.equal(seats.filter((s) => s.angle === 180).length, 3);
    assert.ok(seats.filter((s) => s.angle === 0).every((s) => s.y < tb.y));
    assert.ok(seats.filter((s) => s.angle === 180).every((s) => s.y > tb.y));
  });
});
