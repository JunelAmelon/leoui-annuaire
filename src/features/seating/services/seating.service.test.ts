/**
 * Tests unitaires du service Plan de table — InMemory repository, DIP respecté.
 * Couvre : création, tables, assignations (invariant 1 invité = 1 chaise),
 * auto-assignation (table nommée + side), rotation, éléments de salle.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemorySeatingRepository } from '../repositories/in-memory-seating.repository';
import { createSeatingService } from './seating.service';
import type { SeatingGuest } from '../repositories/seating.repository';
import { roomPolygon, pointInPolygon } from '../domain/room-geometry';

function makeGuests(n: number, side = 'mariée'): SeatingGuest[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `g${i}`,
    name: `Invité ${i}`,
    side,
  }));
}

test('SeatingService - Plan de table', async (t) => {
  const repo = new InMemorySeatingRepository();
  const service = createSeatingService(repo);
  const eventId = 'wedding-2026';
  const ownerId = 'user-123';

  t.beforeEach(() => repo.clear());

  await t.test('1. getOrCreate - crée un plan vide conforme au CDC', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    assert.equal(plan.event_id, eventId, 'event_id = doc ID');
    assert.equal(plan.owner_id, ownerId);
    assert.deepEqual(plan.tables, []);
    assert.deepEqual(plan.room_items, []);
    assert.deepEqual(plan.assignments, {});

    // Idempotent : 2e appel retourne le même plan sans écraser
    const plan2 = await service.getOrCreate(eventId, ownerId);
    assert.equal(plan2.event_id, eventId);
    assert.deepEqual(plan2.tables, []);
  });

  await t.test('2. addTable - ajoute une table avec label auto-incrémenté', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    assert.equal(tables.length, 1);
    assert.equal(tables[0].label, 'Table 1');
    assert.equal(tables[0].shape, 'round');
    assert.equal(tables[0].seats, 8);

    const tables2 = await service.addTable({ ...plan, tables }, 'rect', 6);
    assert.equal(tables2.length, 2);
    assert.equal(tables2[1].label, 'Table 2');
    assert.equal(tables2[1].shape, 'rect');
  });

  await t.test('3. removeTable - supprime la table et purge ses assignations', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const tableId = tables[0].id;

    // Assigner un invité à la table
    const assignments1 = await service.assign({ ...plan, tables }, tableId, 0, 'g0');
    assert.equal(assignments1[`${tableId}_0`], 'g0');

    // Supprimer la table → assignations purgées
    const { tables: remaining, assignments } = await service.removeTable(
      { ...plan, tables, assignments: assignments1 },
      tableId
    );
    assert.equal(remaining.length, 0);
    assert.deepEqual(assignments, {});
  });

  await t.test('4. assign - invariant : 1 invité = 1 chaise (purge anciennes places)', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const t1 = tables[0].id;
    const tables2 = await service.addTable({ ...plan, tables }, 'rect', 6);
    const t2 = tables2[1].id;

    // Placer g0 sur table1 siège 0
    let assignments = await service.assign({ ...plan, tables: tables2 }, t1, 0, 'g0');
    assert.equal(assignments[`${t1}_0`], 'g0');

    // Déplacer g0 sur table2 siège 2 → table1 siège 0 doit être vide
    assignments = await service.assign({ ...plan, tables: tables2, assignments }, t2, 2, 'g0');
    assert.equal(assignments[`${t1}_0`], undefined, 'ancienne place purgée');
    assert.equal(assignments[`${t2}_2`], 'g0');
    assert.equal(Object.values(assignments).filter((v) => v === 'g0').length, 1, '1 seule place');
  });

  await t.test('5. assign(null) - libère une chaise', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const t1 = tables[0].id;

    let assignments = await service.assign({ ...plan, tables }, t1, 3, 'g1');
    assert.equal(assignments[`${t1}_3`], 'g1');

    assignments = await service.assign({ ...plan, tables, assignments }, t1, 3, null);
    assert.equal(assignments[`${t1}_3`], undefined);
  });

  await t.test('6. generateHall - génère tables en grille + éléments de salle', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const next = await service.generateHall(plan, {
      tableCount: 5,
      shape: 'round',
      seats: 8,
      roomItems: ['stage', 'dj', 'dancefloor', 'buffet', 'bar'],
    });

    assert.equal(next.tables.length, 5);
    assert.equal(next.tables[0].label, 'Table 1');
    assert.equal(next.tables[4].label, 'Table 5');
    assert.ok(next.tables.every((t) => t.shape === 'round' && t.seats === 8));

    assert.equal(next.room_items.length, 5);
    assert.ok(next.room_items.some((i) => i.type === 'stage'));
    assert.ok(next.room_items.some((i) => i.type === 'dancefloor'));
    assert.deepEqual(next.assignments, {});

    // Positions centrées (pas de chevauchement avec les murs)
    assert.ok(next.tables.every((t) => t.x > 0 && t.x < 1000 && t.y > 0 && t.y < 700));
  });

  await t.test('7. autoAssign - respecte guests.table (label de table saisi)', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const t1 = tables[0].id; // "Table 1"

    const guests: SeatingGuest[] = [
      { id: 'g0', name: 'Alice', side: 'mariée', table: 'Table 1' },
      { id: 'g1', name: 'Bob', side: 'marié', table: 'Table 1' },
      { id: 'g2', name: 'Carol', side: 'mariée' }, // pas de table → auto par side
    ];

    const assignments = await service.autoAssign({ ...plan, tables }, guests);

    // g0 et g1 placés à Table 1 (label matché)
    assert.equal(assignments[`${t1}_0`], 'g0');
    assert.equal(assignments[`${t1}_1`], 'g1');
    // g2 placé par auto-assign (side)
    assert.ok(Object.values(assignments).includes('g2'));
  });

  await t.test('8. autoAssign - ne place que les invités non déjà placés', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const t1 = tables[0].id;

    // g0 déjà placé manuellement
    let assignments = await service.assign({ ...plan, tables }, t1, 0, 'g0');

    const guests = makeGuests(3, 'mariée'); // g0, g1, g2
    assignments = await service.autoAssign({ ...plan, tables, assignments }, guests);

    // g0 garde sa place, g1/g2 remplissent les chaises libres
    assert.equal(assignments[`${t1}_0`], 'g0');
    assert.ok(Object.values(assignments).includes('g1'));
    assert.ok(Object.values(assignments).includes('g2'));
    assert.equal(Object.values(assignments).filter((v) => v === 'g0').length, 1);
  });

  await t.test('9. setSeatType - applique les types de chaises', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const t1 = tables[0].id;

    let tables2 = await service.setSeatType({ ...plan, tables }, t1, 0, 'enfant');
    assert.equal(tables2[0].seat_types?.[0], 'enfant');

    tables2 = await service.setSeatType({ ...plan, tables: tables2 }, t1, 1, 'pmr');
    assert.equal(tables2[0].seat_types?.[1], 'pmr');

    // Basculer à null → supprime le type
    tables2 = await service.setSeatType({ ...plan, tables: tables2 }, t1, 0, null);
    assert.equal(tables2[0].seat_types?.[0], undefined);
    assert.equal(tables2[0].seat_types?.[1], 'pmr'); // inchangé
  });

  await t.test('10. updateTable - patch générique (couleur, label, seats)', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const t1 = tables[0].id;

    let tables2 = await service.updateTable({ ...plan, tables }, t1, { label: 'Table d\u2019honneur', color: '#FBE8ED' });
    assert.equal(tables2[0].label, 'Table d\u2019honneur');
    assert.equal(tables2[0].color, '#FBE8ED');

    tables2 = await service.updateTable({ ...plan, tables: tables2 }, t1, { seats: 10 });
    assert.equal(tables2[0].seats, 10);
  });

  await t.test('11. rotateElement - rotation absolue et delta', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'rect', 6);
    const t1 = tables[0].id;

    // Rotation absolue
    let next = await service.rotateElement({ ...plan, tables }, t1, 90);
    assert.equal(next.tables[0].rotation, 90);

    // Rotation delta
    next = await service.rotateElement(next, t1, 45, true);
    assert.equal(next.tables[0].rotation, 135);

    // Wrap 360
    next = await service.rotateElement(next, t1, 270, true);
    assert.equal(next.tables[0].rotation, 45); // 135+270=405 → 45
  });

  await t.test('12. guestSeat - retourne la clé de chaise d\u2019un invité', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const t1 = tables[0].id;

    const assignments = await service.assign({ ...plan, tables }, t1, 5, 'g7');
    const planWith = { ...plan, tables, assignments };
    assert.equal(service.guestSeat(planWith, 'g7'), `${t1}_5`);
    assert.equal(service.guestSeat(planWith, 'inconnu'), null);
  });

  await t.test('14. setRoom - change la forme et ramène les éléments dans le contour', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const hall = await service.generateHall(plan, { tableCount: 8, shape: 'round', seats: 8, roomItems: ['dancefloor', 'bar'] });
    const next = await service.setRoom(hall, { shape: 'l', width_m: 30, length_m: 20 });
    assert.equal(next.room?.shape, 'l');
    assert.equal(next.room?.width_m, 30);
    const poly = roomPolygon(next.room!);
    for (const tb of next.tables) {
      const c = { x: tb.x + 42, y: tb.y + 42 };
      assert.ok(pointInPolygon(c, poly), `${tb.label} dans le L`);
    }
    assert.equal(next.tables.length, 8, 'aucune table perdue');
    assert.equal(next.room_items.length, 2, 'aucun élément perdu');
    const stored = await repo.getByEventId(eventId);
    assert.equal(stored?.room?.shape, 'l', 'persisté');
  });

  await t.test('15. generateHall - respecte une salle en U (aucune table dans le creux)', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const withRoom = await service.setRoom(plan, { shape: 'u', width_m: 36, length_m: 24 });
    const hall = await service.generateHall(withRoom, { tableCount: 14, shape: 'round', seats: 8, roomItems: ['stage', 'dancefloor', 'buffet'] });
    const poly = roomPolygon(hall.room!);
    assert.equal(hall.tables.length, 14);
    for (const tb of hall.tables) assert.ok(pointInPolygon({ x: tb.x + 42, y: tb.y + 42 }, poly), `${tb.label} dans le U`);
    // aucune table ne se superpose à une autre
    for (let i = 0; i < hall.tables.length; i++)
      for (let j = i + 1; j < hall.tables.length; j++)
        assert.ok(Math.hypot(hall.tables[i].x - hall.tables[j].x, hall.tables[i].y - hall.tables[j].y) > 84, 'pas de chevauchement');
  });

  await t.test('16. setDecor - fusionne avec les valeurs par défaut et persiste', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const next = await service.setDecor(plan, { floor: 'marbre', chair_style: 'ghost' });
    assert.equal(next.decor?.floor, 'marbre');
    assert.equal(next.decor?.chair_style, 'ghost');
    assert.equal(next.decor?.mood, 'jour', 'valeur par défaut conservée');
    const again = await service.setDecor(next, { mood: 'soiree' });
    assert.equal(again.decor?.floor, 'marbre', 'patch cumulatif');
    assert.equal(again.decor?.mood, 'soiree');
  });

  await t.test('17. duplicateElement - copie une table (sans invités) et un élément', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const hall = await service.generateHall(plan, { tableCount: 2, shape: 'round', seats: 6, roomItems: ['bar'] });
    const src = hall.tables[0];
    const withGuest = { ...hall, assignments: await service.assign(hall, src.id, 0, 'g0') };
    const t1 = await service.duplicateElement(withGuest, src.id);
    assert.equal(t1.plan.tables.length, 3);
    assert.ok(t1.newId && t1.newId !== src.id);
    assert.equal(Object.keys(t1.plan.assignments).filter((k) => k.startsWith(`${t1.newId}_`)).length, 0, 'invités non copiés');
    const t2 = await service.duplicateElement(t1.plan, hall.room_items[0].id);
    assert.equal(t2.plan.room_items.length, 2);
    const t3 = await service.duplicateElement(t2.plan, 'inconnu');
    assert.equal(t3.newId, null);
  });

  await t.test('13. save - persiste un état complet (undo/redo)', async () => {
    const plan = await service.getOrCreate(eventId, ownerId);
    const tables = await service.addTable(plan, 'round', 8);
    const modified = { ...plan, tables };

    await service.save(modified);
    const retrieved = await repo.getByEventId(eventId);
    assert.equal(retrieved?.tables.length, 1);
    assert.equal(retrieved?.tables[0].seats, 8);
  });
});
