import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GazetteService, MAX_GAZETTE_SECTIONS } from './gazette.service';
import { InMemoryGazetteRepository } from '../repositories/in-memory-gazette.repository';
import type { ProgramItem } from '../domain/types';

describe('GazetteService - Unit Tests', () => {
  let repository: InMemoryGazetteRepository;
  let service: GazetteService;
  const EVENT_ID = 'wedding_paris_2026';
  const OWNER_ID = 'user_sophie_thomas_123';

  beforeEach(() => {
    repository = new InMemoryGazetteRepository();
    service = new GazetteService(repository);
  });

  it('1. getOrCreateGazette - Initialise une gazette type conforme au schéma Firestore', async () => {
    const gazette = await service.getOrCreateGazette(EVENT_ID, OWNER_ID, {
      title: 'L’Écho de Sophie & Thomas',
      weddingDate: '2026-09-12',
      locationName: 'Château de Champlâtreux',
    });

    assert.equal(gazette.event_id, EVENT_ID);
    assert.equal(gazette.owner_id, OWNER_ID);
    assert.equal(gazette.title, 'L’Écho de Sophie & Thomas');
    assert.equal(gazette.wedding_date, '2026-09-12');
    assert.equal(gazette.location_name, 'Château de Champlâtreux');
    assert.equal(gazette.version, 1);
    assert.equal(gazette.program_source, 'plan');
    assert.ok(gazette.sections.length >= 4);
    assert.equal(gazette.layout.theme, 'vintage_gazette');

    // Vérifie la persistance dans le repository
    const stored = await repository.getByEventId(EVENT_ID);
    assert.ok(stored);
    assert.equal(stored.title, 'L’Écho de Sophie & Thomas');
  });

  it('2. getOrCreateGazette - Retourne la gazette existante sans la réécraser', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID, {
      title: 'Gazette Initiale',
    });

    const secondCall = await service.getOrCreateGazette(EVENT_ID, OWNER_ID, {
      title: 'Nouveau Titre Ignoré',
    });

    assert.equal(secondCall.title, 'Gazette Initiale');
    assert.equal(secondCall.version, initial.version);
  });

  it('3. getOrCreateGazette - Rejette les paramètres manquants', async () => {
    await assert.rejects(
      () => service.getOrCreateGazette('', OWNER_ID),
      /eventId et ownerId sont requis/
    );
    await assert.rejects(
      () => service.getOrCreateGazette(EVENT_ID, ''),
      /eventId et ownerId sont requis/
    );
  });

  it('4. updateMetadata - Met à jour les métadonnées et incrémente la version', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID);

    const updated = await service.updateMetadata(EVENT_ID, {
      title: 'The Wedding Gazette',
      subtitle: 'Tirage Limité pour nos Familles',
      editorial: 'Un mot d’accueil chaleureux.',
      layout: {
        theme: 'chic_minimal',
        accent_color: '#0f172a',
      },
      expected_version: initial.version,
    });

    assert.equal(updated.title, 'The Wedding Gazette');
    assert.equal(updated.subtitle, 'Tirage Limité pour nos Familles');
    assert.equal(updated.layout.theme, 'chic_minimal');
    assert.equal(updated.version, initial.version + 1);
  });

  it('5. addSection - Ajoute une section et respecte le plafond de 30 sections', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID);

    const withNewSection = await service.addSection(
      EVENT_ID,
      {
        type: 'custom',
        title: 'Interview des Témoins',
        content: {
          subtitle: 'Ce qu’ils ne devaient pas dire',
          body: 'Des révélations exclusives sur nos années fac...',
        },
      },
      initial.version
    );

    assert.equal(withNewSection.sections.length, initial.sections.length + 1);
    const lastSection = withNewSection.sections[withNewSection.sections.length - 1];
    assert.equal(lastSection.title, 'Interview des Témoins');
    assert.equal(lastSection.type, 'custom');
    assert.equal(lastSection.order, withNewSection.sections.length);

    // Test de la limite de 30 sections
    let current = withNewSection;
    while (current.sections.length < MAX_GAZETTE_SECTIONS) {
      current = await service.addSection(
        EVENT_ID,
        {
          type: 'anecdote',
          title: `Anecdote ${current.sections.length + 1}`,
          content: { items: [] },
        },
        current.version
      );
    }

    assert.equal(current.sections.length, MAX_GAZETTE_SECTIONS);

    // La 31ème doit lever une exception
    await assert.rejects(
      () =>
        service.addSection(
          EVENT_ID,
          {
            type: 'anecdote',
            title: 'Section excédentaire',
            content: { items: [] },
          },
          current.version
        ),
      /Limite atteinte/
    );
  });

  it('6. updateSection - Modifie le contenu et passe le programme en mode "custom"', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID);
    const programSection = initial.sections.find((s) => s.type === 'program');
    assert.ok(programSection);

    const updated = await service.updateSection(
      EVENT_ID,
      programSection.id,
      {
        title: 'Horaires Réaménagés',
      },
      initial.version
    );

    assert.equal(updated.program_source, 'custom');
    const modified = updated.sections.find((s) => s.id === programSection.id);
    assert.equal(modified?.title, 'Horaires Réaménagés');
  });

  it('7. removeSection - Supprime et réordonne de 1 à N', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID);
    const toRemoveId = initial.sections[1].id;

    const afterRemoval = await service.removeSection(
      EVENT_ID,
      toRemoveId,
      initial.version
    );

    assert.equal(afterRemoval.sections.length, initial.sections.length - 1);
    assert.ok(!afterRemoval.sections.some((s) => s.id === toRemoveId));

    // Vérifie que les ordres sont continus 1, 2, 3...
    afterRemoval.sections.forEach((s, idx) => {
      assert.equal(s.order, idx + 1);
    });
  });

  it('8. reorderSections - Réorganise correctement l’ordre des sections', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID);
    const ids = initial.sections.map((s) => s.id);
    const reversedIds = [...ids].reverse();

    const reordered = await service.reorderSections(
      EVENT_ID,
      reversedIds,
      initial.version
    );

    assert.equal(reordered.sections[0].id, reversedIds[0]);
    assert.equal(reordered.sections[0].order, 1);
    assert.equal(
      reordered.sections[reordered.sections.length - 1].id,
      reversedIds[reversedIds.length - 1]
    );
    assert.equal(
      reordered.sections[reordered.sections.length - 1].order,
      reordered.sections.length
    );
  });

  it('9. syncProgramFromDayPlan - Synchronise les moments du planning et met à jour program_synced_at', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID);

    const dayPlanItems: ProgramItem[] = [
      {
        time: '14:00',
        title: 'Cérémonie Laïque au Parc',
        description: 'Échange des alliances',
        location: 'Kiosque du Parc',
      },
      {
        time: '18:00',
        title: 'Champagne & Jazz Manouche',
        location: 'Terrasse Ouest',
      },
    ];

    const synced = await service.syncProgramFromDayPlan(
      EVENT_ID,
      dayPlanItems,
      initial.version
    );

    assert.equal(synced.program_source, 'plan');
    assert.ok(synced.program_synced_at);

    const programSec = synced.sections.find((s) => s.type === 'program');
    assert.ok(programSec);
    const content = programSec.content as { items: ProgramItem[] };
    assert.equal(content.items.length, 2);
    assert.equal(content.items[0].title, 'Cérémonie Laïque au Parc');
  });

  it('10. Optimistic Locking - Rejette la modification si version attendue obsolète', async () => {
    const initial = await service.getOrCreateGazette(EVENT_ID, OWNER_ID);

    // Première mise à jour réussie (version 1 -> 2)
    await service.updateMetadata(EVENT_ID, {
      title: 'Titre Étape 1',
      expected_version: initial.version,
    });

    // Tentative concurrente avec l'ancienne version 1 -> doit échouer
    await assert.rejects(
      () =>
        service.updateMetadata(EVENT_ID, {
          title: 'Titre Conflit Écrasement',
          expected_version: initial.version, // périmé car la version est désormais 2 !
        }),
      /Conflit d’édition/
    );
  });
});

