import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMenuRepository } from '../repositories/in-memory-menu.repository';
import { MenuService } from './menu.service';
import { countMenuDishes } from '../domain/menu-rules';

function createService() {
  const repo = new InMemoryMenuRepository();
  const service = new MenuService({
    reader: repo,
    writer: repo,
    decisions: repo,
    guests: repo,
  });
  return { repo, service };
}

describe('MenuService', () => {
  it('initialise un menu avec les 6 services par défaut', async () => {
    const { service } = createService();
    const menu = await service.getOrInitMenu('evt_1', 'user_1');

    assert.equal(menu.event_id, 'evt_1');
    assert.equal(menu.owner_id, 'user_1');
    assert.equal(menu.courses.length, 6);
    assert.deepEqual(
      menu.courses.map((c) => c.key),
      ['vin_honneur', 'entree', 'plat', 'fromage', 'dessert', 'cafe']
    );
  });

  it('ajoute, valide et journalise les décisions sur les plats retenus', async () => {
    const { service } = createService();
    await service.getOrInitMenu('evt_2', 'user_1');

    const added = await service.addDish(
      'evt_2',
      'entree',
      { name: 'Carpaccio de Saint-Jacques', note: 'Agrumes et huile de vanille', status: 'a_valider' },
      'Claire & Julien'
    );
    assert.equal(added.decision, null);

    const validated = await service.updateDish(
      'evt_2',
      'entree',
      added.dish.id,
      { status: 'retenu' },
      'Claire & Julien'
    );
    assert.ok(validated.decision);
    assert.match(validated.decision.change, /validé et retenu/);

    const counts = countMenuDishes(validated.courses);
    assert.equal(counts.total, 1);
    assert.equal(counts.retenu, 1);

    const removed = await service.removeDish('evt_2', 'entree', added.dish.id, 'Claire & Julien');
    assert.ok(removed.decision);
    assert.match(removed.decision.change, /suppression du plat retenu/);
  });

  it('rejette un nom de plat vide', async () => {
    const { service } = createService();
    await service.getOrInitMenu('evt_3', 'user_1');

    await assert.rejects(
      () => service.addDish('evt_3', 'plat', { name: '   ' }),
      /obligatoire/
    );
  });

  it('calcule les régimes alimentaires depuis la liste des invités sans inclure les déclinés', async () => {
    const { repo, service } = createService();
    repo.seedGuests('evt_4', [
      { id: 'g1', name: 'Alice Martin', rsvp: 'confirmed', menu: 'Standard' },
      { id: 'g2', name: 'Lucas Bernard', rsvp: 'confirmed', menu: 'Végétarien' },
      { id: 'g3', name: 'Emma Petit', rsvp: 'confirmed', menu: 'Autre', menu_other: 'Allergie arachides' },
      { id: 'g4', name: 'Paul Durand', rsvp: 'pending', menu: 'Sans gluten' },
      { id: 'g5', name: 'Marc Moreau', rsvp: 'declined', menu: 'Vegan' },
    ]);

    const summary = await service.getDietarySummary('evt_4');
    assert.equal(summary.total_confirmed, 3);
    assert.equal(summary.total_pending, 1);

    const veg = summary.categories.find((c) => c.category === 'Végétarien');
    assert.equal(veg?.confirmed, 1);

    const vegan = summary.categories.find((c) => c.category === 'Vegan');
    assert.equal(vegan?.confirmed, 0);

    assert.equal(summary.special_requests.length, 2);
    assert.equal(summary.special_requests[0].guest_name, 'Emma Petit');
    assert.equal(summary.special_requests[0].menu_other, 'Allergie arachides');
  });

  it('pagine l’historique des décisions', async () => {
    const { service } = createService();
    await service.getOrInitMenu('evt_5', 'user_1');

    await service.addManualDecision('evt_5', 'Claire', 'Décision 1');
    await service.addManualDecision('evt_5', 'Claire', 'Décision 2');
    await service.addManualDecision('evt_5', 'Julien', 'Décision 3');

    const page1 = await service.listDecisions('evt_5', { limitCount: 2 });
    assert.equal(page1.items.length, 2);
    assert.equal(page1.hasMore, true);
    assert.ok(page1.nextCursor);

    const page2 = await service.listDecisions('evt_5', {
      limitCount: 2,
      cursor: page1.nextCursor,
    });
    assert.equal(page2.items.length, 1);
    assert.equal(page2.hasMore, false);
  });
});

