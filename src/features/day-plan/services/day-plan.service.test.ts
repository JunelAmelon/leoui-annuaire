import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DayPlanService } from './day-plan.service';
import { DayPlanShareService } from './day-plan-share.service';
import { DayPlanDispatchService } from './day-plan-dispatch.service';
import type { VendorContact, VendorMessenger } from '../repositories/vendor-contact.repository.interface';
import { InMemoryDayPlanRepository, InMemoryVendorRequestRepository } from '../repositories/in-memory-day-plan.repository';
import {
  buildStartAt, detectAlerts, isAfterMidnight, liveState, shiftFrom, sortItems, timeOf,
  directionsUrl, toGazetteProgram, toPlaylistMoments, formatDuration, formatLongDate, normalizeWeddingDate,
} from '../domain/timeline';
import type { DayPlan, TimelineItem, TimelineItemInput } from '../domain/types';

const WEDDING = '2026-09-12';

const input = (over: Partial<TimelineItemInput> = {}): TimelineItemInput => ({
  title: 'Cérémonie', time: '14:30', duration_min: 60, category: 'ceremony',
  location_name: '', location_address: '', travel_min: 0, people: [], notes: '', vendor_ids: [], ...over,
});

function setup() {
  const repo = new InMemoryDayPlanRepository();
  const requests = new InMemoryVendorRequestRepository();
  let n = 0;
  const deleted: string[] = [];
  const service = new DayPlanService(repo, requests, {
    newId: () => `id-${String(++n).padStart(4, '0')}-aaaaaaaaaaaaaaaa`,
    now: () => '2026-09-01T10:00:00.000Z',
    cleaner: { onMomentDeleted: async (_e, id) => { deleted.push(id); } },
  });
  const share = new DayPlanShareService(repo, requests, () => '2026-09-02T10:00:00.000Z');
  return { repo, requests, service, share, deleted };
}

const item = (id: string, start: string, duration: number, place = '', travel = 0): TimelineItem => ({
  id, title: id, start_at: start, end_at: null, duration_min: duration, category: 'other',
  location: { name: place, address: '', travel_min: travel }, people: [], notes: '', vendor_ids: [], sort_key: 0,
});

describe('chronologie (règles pures)', () => {
  test('une heure avant 06:00 est rangée après minuit, en fin de journée', () => {
    assert.equal(buildStartAt(WEDDING, '23:00'), '2026-09-12T23:00:00');
    assert.equal(buildStartAt(WEDDING, '01:30'), '2026-09-13T01:30:00');
    const sorted = sortItems([item('fin', buildStartAt(WEDDING, '02:00'), 30), item('bal', buildStartAt(WEDDING, '22:45'), 15), item('matin', buildStartAt(WEDDING, '09:00'), 60)]);
    assert.deepEqual(sorted.map((i) => i.id), ['matin', 'bal', 'fin']);
    assert.equal(isAfterMidnight(sorted[2], WEDDING), true);
    assert.equal(isAfterMidnight(sorted[1], WEDDING), false);
  });

  test('le passage de mois et d’année est géré', () => {
    assert.equal(buildStartAt('2026-12-31', '00:30'), '2027-01-01T00:30:00');
  });

  test('trajet impossible, trajet serré, trajet inconnu et chevauchement', () => {
    const base = item('ceremonie', '2026-09-12T14:30:00', 60, 'Église');
    const impossible = detectAlerts([base, item('cocktail', '2026-09-12T15:40:00', 60, 'Château', 25)]);
    assert.equal(impossible[0].kind, 'travel_impossible');
    assert.equal(impossible[0].level, 'danger');
    assert.equal(impossible[0].missing_min, 25); // 25 + 10 de marge − 10 de battement
    assert.equal(impossible[0].suggested_start_at, '2026-09-12T16:05:00');

    const tight = detectAlerts([base, item('cocktail', '2026-09-12T16:00:00', 60, 'Château', 25)]);
    assert.equal(tight[0].kind, 'travel_tight');
    assert.equal(tight[0].missing_min, 5);

    assert.equal(detectAlerts([base, item('cocktail', '2026-09-12T16:05:00', 60, 'Château', 25)]).length, 0);
    assert.equal(detectAlerts([base, item('cocktail', '2026-09-12T16:05:00', 60, 'Château', 0)])[0].kind, 'travel_unknown');
    assert.equal(detectAlerts([base, item('photos', '2026-09-12T15:10:00', 30, 'Église')])[0].kind, 'overlap');
    assert.equal(detectAlerts([base, item('photos', '2026-09-12T15:30:00', 30, 'église ')]).length, 0);
  });

  test('le décalage en cascade déplace la suite et résout l’alerte', () => {
    const items = [item('a', '2026-09-12T14:30:00', 60, 'Église'), item('b', '2026-09-12T15:40:00', 60, 'Château', 25), item('c', '2026-09-12T19:30:00', 120, 'Château')];
    const [alert] = detectAlerts(items);
    const next = shiftFrom(items, alert.item_id, alert.missing_min, true);
    assert.deepEqual(next.map((i) => timeOf(i.start_at)), ['14:30', '16:05', '19:55']);
    assert.equal(detectAlerts(next).length, 0);
    assert.deepEqual(shiftFrom(items, 'b', 25, false).map((i) => timeOf(i.start_at)), ['14:30', '16:05', '19:30']);
  });

  test('vue en direct : en cours, entre deux moments, terminé', () => {
    const items = [item('a', '2026-09-12T14:00:00', 60), item('b', '2026-09-12T16:00:00', 60)];
    const running = liveState(items, '2026-09-12T14:30:00');
    assert.equal(running.phase, 'running');
    assert.equal(running.current[0].id, 'a');
    assert.equal(running.progress, 0.5);
    assert.equal(running.minutes_to_next, 90);
    assert.equal(liveState(items, '2026-09-12T15:30:00').phase, 'between');
    assert.equal(liveState(items, '2026-09-12T09:00:00').phase, 'before');
    assert.equal(liveState(items, '2026-09-12T18:00:00').phase, 'done');
    assert.equal(liveState([], '2026-09-12T18:00:00').phase, 'empty');
  });

  test('formats', () => {
    assert.equal(formatDuration(45), '45 min');
    assert.equal(formatDuration(120), '2 h');
    assert.equal(formatDuration(135), '2 h 15');
    assert.equal(formatLongDate(WEDDING), 'samedi 12 septembre 2026');
    assert.equal(normalizeWeddingDate('2026-09-12T00:00:00.000Z'), WEDDING);
    assert.equal(normalizeWeddingDate('bientôt'), null);
  });
});

describe('DayPlanService', () => {
  test('crée le planning avec les trois journées datées', async () => {
    const { service, repo } = setup();
    const plan = await service.getOrCreate('evt', 'owner', WEDDING);
    assert.deepEqual([plan.days.eve.date, plan.days.day.date, plan.days.after.date], ['2026-09-11', WEDDING, '2026-09-13']);
    assert.equal(repo.writes, 1);
    await service.getOrCreate('evt', 'owner', WEDDING);
    assert.equal(repo.writes, 1, 'aucune écriture si rien ne change');
  });

  test('ajoute, trie, modifie sans changer l’id et supprime en prévenant la Playlist', async () => {
    const { service, repo, deleted } = setup();
    let plan = await service.getOrCreate('evt', 'owner', WEDDING);
    plan = await service.addItem(plan, 'day', input({ title: 'Soirée', time: '23:00', category: 'party' }));
    plan = await service.addItem(plan, 'day', input({ title: 'Fin', time: '02:00', category: 'logistics' }));
    plan = await service.addItem(plan, 'day', input());
    assert.deepEqual(plan.days.day.items.map((i) => i.title), ['Cérémonie', 'Soirée', 'Fin']);

    const id = plan.days.day.items[0].id;
    plan = await service.updateItem(plan, 'day', id, input({ title: 'Cérémonie laïque', time: '15:00' }));
    assert.equal(plan.days.day.items[0].id, id);
    assert.equal(plan.days.day.items[0].end_at, '2026-09-12T16:00:00');

    plan = await service.updateItem(plan, 'day', id, input({ title: 'Répétition', time: '18:00' }), 'eve');
    assert.equal(plan.days.eve.items[0].start_at, '2026-09-11T18:00:00');
    assert.equal(plan.days.day.items.length, 2);

    plan = await service.removeItem(plan, 'eve', id);
    assert.deepEqual(deleted, [id]);
    assert.deepEqual((await repo.getByEventId('evt'))!.days, plan.days);
  });

  test('refuse une saisie invalide', async () => {
    const { service } = setup();
    const plan = await service.getOrCreate('evt', 'owner', WEDDING);
    await assert.rejects(() => service.addItem(plan, 'day', input({ title: '  ', time: '25:00' })), (e: any) => Boolean(e.fields.title && e.fields.time));
  });

  test('le changement de date du mariage recale tout le planning', async () => {
    const { service } = setup();
    let plan = await service.getOrCreate('evt', 'owner', WEDDING);
    plan = await service.addItem(plan, 'day', input({ time: '01:00' }));
    const moved = await service.getOrCreate('evt', 'owner', '2026-10-03');
    assert.equal(moved.days.eve.date, '2026-10-02');
    assert.equal(moved.days.day.items[0].start_at, '2026-10-04T01:00:00');
  });

  test('le déroulé type ne remplit que les journées vides', async () => {
    const { service } = setup();
    let plan = await service.getOrCreate('evt', 'owner', WEDDING);
    plan = await service.addItem(plan, 'eve', input({ title: 'Mon dîner', time: '20:00' }));
    plan = await service.applyTemplate(plan);
    assert.equal(plan.days.eve.items.length, 1);
    assert.ok(plan.days.day.items.length > 8);
    assert.equal(plan.days.day.items.at(-1)!.start_at.slice(0, 10), '2026-09-13');
    assert.equal(new Set(plan.days.day.items.map((i) => i.id)).size, plan.days.day.items.length);
  });

  test('ponts Gazette et Playlist', async () => {
    const { service } = setup();
    let plan = await service.getOrCreate('evt', 'owner', WEDDING);
    plan = await service.addItem(plan, 'day', input({ title: 'Coiffure', time: '09:00', category: 'preparation' }));
    plan = await service.addItem(plan, 'day', input({ location_name: 'Mairie' }));
    plan = await service.addItem(plan, 'day', input({ title: 'Ouverture de bal', time: '22:45', category: 'party' }));
    assert.deepEqual(toGazetteProgram(plan), [
      { time: '14:30', title: 'Cérémonie', location: 'Mairie' },
      { time: '22:45', title: 'Ouverture de bal' },
    ]);
    const moments = toPlaylistMoments(plan);
    assert.deepEqual(moments.map((m) => m.label), ['Cérémonie', 'Ouverture de bal']);
    assert.equal(moments[0].id, plan.days.day.items[1].id);
  });
});

describe('partage prestataires', () => {
  async function shared() {
    const ctx = setup();
    let plan: DayPlan = await ctx.service.getOrCreate('evt', 'owner', WEDDING);
    plan = await ctx.service.enableShare(plan);
    plan = await ctx.service.addVendorLink(plan, 'Traiteur Dupont');
    const vendor = plan.share.vendor_links[0];
    plan = await ctx.service.addItem(plan, 'day', input({ title: 'Dîner', time: '19:30', category: 'meal', notes: 'Allergie arachide table 4', vendor_ids: [vendor.vendor_id] }));
    plan = await ctx.service.addItem(plan, 'day', input({ title: 'Gâteau', time: '22:15', duration_min: 20, category: 'meal' }));
    return { ...ctx, plan, vendor };
  }

  test('le lien général masque les notes, le lien prestataire les montre', async () => {
    const { share, plan, vendor } = await shared();
    const guest = await share.getPublicView('evt', plan.share.token!);
    assert.equal(guest.viewer.kind, 'guest');
    assert.equal(guest.days.day.items[0].notes, '');
    assert.equal(JSON.stringify(guest).includes(vendor.token), false, 'aucun jeton ne fuit');
    const pro = await share.getPublicView('evt', vendor.token);
    assert.equal(pro.days.day.items[0].notes, 'Allergie arachide table 4');
  });

  test('un lien révoqué ou inconnu est refusé', async () => {
    const { share, service, plan, vendor } = await shared();
    await assert.rejects(() => share.resolve('evt', 'x'.repeat(36)), /plus valide/);
    const revoked = await service.setVendorAccess(plan, vendor.vendor_id, false);
    await assert.rejects(() => share.resolve('evt', vendor.token), /plus valide/);
    const again = await service.setVendorAccess(revoked, vendor.vendor_id, true);
    assert.notEqual(again.share.vendor_links[0].token, vendor.token);
    await service.revokeShare(again);
    await assert.rejects(() => share.resolve('evt', plan.share.token!), /plus valide/);
  });

  test('proposition de décalage : contrôles puis acceptation en cascade', async () => {
    const { share, service, plan, vendor } = await shared();
    const [diner, gateau] = plan.days.day.items;
    await assert.rejects(() => share.proposeShift('evt', plan.share.token!, { item_id: diner.id, time: '20:00', reason: '' }), /prestataires/);
    await assert.rejects(() => share.proposeShift('evt', vendor.token, { item_id: gateau.id, time: '22:30', reason: '' }), /n’intervenez pas/);
    await assert.rejects(() => share.proposeShift('evt', vendor.token, { item_id: diner.id, time: '19:30', reason: '' }), /déjà l’heure/);

    const request = await share.proposeShift('evt', vendor.token, { item_id: diner.id, time: '20:00', reason: 'Cuisson des pièces chaudes' });
    assert.equal(request.status, 'pending');
    assert.equal(request.proposed_start_at, '2026-09-12T20:00:00');
    assert.equal((await service.listRequests('evt')).length, 1);

    const next = await service.decideRequest(plan, request, true, true);
    assert.deepEqual(next.days.day.items.map((i) => timeOf(i.start_at)), ['20:00', '22:45']);
    const [stored] = await service.listRequests('evt');
    assert.equal(stored.status, 'accepted');
    await assert.rejects(() => service.decideRequest(next, stored, false), /déjà été traitée/);
  });

  test('refuser ne change pas le planning', async () => {
    const { share, service, plan, vendor } = await shared();
    const request = await share.proposeShift('evt', vendor.token, { item_id: plan.days.day.items[0].id, time: '20:00', reason: '' });
    const next = await service.decideRequest(plan, request, false);
    assert.deepEqual(next.days, plan.days);
    assert.equal((await service.listRequests('evt'))[0].status, 'declined');
  });
});

describe('itinéraire et diffusion aux prestataires', () => {
  test('le lien d’itinéraire combine nom et adresse, ou renvoie null sans lieu', () => {
    assert.equal(directionsUrl({ name: '', address: '' }), null);
    const url = directionsUrl({ name: 'Château de la Mariée', address: '12 Rue des Lilas 69001 Lyon' })!;
    assert.ok(url.startsWith('https://www.google.com/maps/dir/?api=1&destination='));
    assert.ok(url.includes(encodeURIComponent('Château de la Mariée, 12 Rue des Lilas 69001 Lyon')));
    assert.ok(directionsUrl({ name: 'Mairie', address: '' })!.endsWith(encodeURIComponent('Mairie')));
  });

  test('ensureVendorLinks crée, réactive et ne duplique pas', async () => {
    const { service } = setup();
    let plan = await service.getOrCreate('evt', 'own', WEDDING);
    const vendors = [{ ref_id: 'vA', label: 'Traiteur Dupont' }, { ref_id: 'vB', label: 'DJ Max' }];
    plan = await service.ensureVendorLinks(plan, vendors);
    assert.equal(plan.share.vendor_links.length, 2);
    const first = plan.share.vendor_links[0];
    plan = await service.ensureVendorLinks(plan, vendors);
    assert.equal(plan.share.vendor_links.length, 2);
    assert.equal(plan.share.vendor_links[0].token, first.token, 'un lien actif est conservé');
    plan = await service.setVendorAccess(plan, first.vendor_id, false);
    plan = await service.ensureVendorLinks(plan, vendors);
    assert.equal(plan.share.vendor_links[0].token_revoked_at, null);
    assert.notEqual(plan.share.vendor_links[0].token, first.token, 'un accès coupé reçoit un nouveau jeton');
  });

  test('sendLinks envoie un message par prestataire et signale les échecs', async () => {
    const { service } = setup();
    const plan = await service.getOrCreate('evt', 'own', WEDDING);
    const messages: { to: string; text: string }[] = [];
    const messenger: VendorMessenger = {
      send: async (c, _s, text) => { if (c.ref_id === 'vBad') throw new Error('x'); messages.push({ to: c.ref_id, text }); },
    };
    const contacts: VendorContact[] = [
      { ref_id: 'vA', name: 'Traiteur', collaborated: true, conversation_id: 'c1' },
      { ref_id: 'vBad', name: 'Fleuriste', collaborated: false, conversation_id: null },
    ];
    const res = await new DayPlanDispatchService(service, messenger).sendLinks(plan, contacts, { uid: 'u', name: 'Sophie & Thomas', client_id: 'cl' }, 'Sophie & Thomas', (e, t) => `https://x/${e}/${t}`);
    assert.deepEqual(res.sent, ['Traiteur']);
    assert.deepEqual(res.failed, ['Fleuriste']);
    const token = res.plan.share.vendor_links.find((l) => l.ref_id === 'vA')!.token;
    assert.ok(messages[0].text.includes(`https://x/evt/${token}`));
    assert.equal(res.plan.share.vendor_links.length, 2);
  });
});
