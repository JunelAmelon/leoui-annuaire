import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryGuestbookRepository } from '../repositories/in-memory-guestbook.repository';
import { GuestbookService } from './guestbook.service';
import { GUESTBOOK_DEFAULTS } from '../domain/types';
import {
  CARD_TABLE_COUNT_MAX, DEFAULT_GUESTBOOK_COVER, GUESTBOOK_PAGE_DEFAULTS, resolveCardDesign,
} from '../domain/customization';

test('GuestbookService - Unit Tests', async (t) => {
  const repository = new InMemoryGuestbookRepository();
  const service = new GuestbookService(repository);

  t.beforeEach(() => {
    repository.clear();
  });

  await t.test('1. getOrCreateGuestbook - Création initiale avec schéma conforme', async () => {
    const eventId = 'event-wedding-2026';
    const ownerId = 'user-couple-123';

    const gb = await service.getOrCreateGuestbook(eventId, ownerId, 'Notre Mariage');

    assert.equal(gb.event_id, eventId, 'L’identifiant du document doit être strictement event_id');
    assert.equal(gb.owner_id, ownerId, 'L’owner_id doit être présent pour les règles Firestore');
    assert.equal(gb.title, 'Notre Mariage');
    assert.ok(gb.public_token, 'Un public_token opaque doit être généré');
    assert.equal(gb.settings.max_duration_sec, GUESTBOOK_DEFAULTS.MAX_DURATION_SEC);
    assert.equal(gb.settings.max_audio_mb, GUESTBOOK_DEFAULTS.MAX_AUDIO_MB);

    // Idempotence : un second appel doit retourner le même sans écraser
    const secondCall = await service.getOrCreateGuestbook(eventId, ownerId, 'Nouveau Titre Ignoré');
    assert.equal(secondCall.public_token, gb.public_token, 'Le token doit rester inchangé');
    assert.equal(secondCall.title, 'Notre Mariage');
  });

  await t.test('2. getOrCreateGuestbook - Rejette les IDs manquants', async () => {
    await assert.rejects(
      () => service.getOrCreateGuestbook('', 'owner-1'),
      /eventId et ownerId requis/
    );
  });

  await t.test('3. getPublicGuestbookInfo & Soumission - Gestion stricte de la fenêtre d’ouverture', async () => {
    const gb = await service.getOrCreateGuestbook('event-1', 'owner-1', 'Livre de Test');

    // Token valide & sans restriction temporelle
    const info = await service.getPublicGuestbookInfo(gb.public_token);
    assert.ok(info);
    assert.equal(info.title, 'Livre de Test');
    assert.equal(info.isOpen, true);

    // Fenêtre fermée : date d'ouverture future
    const futureDate = new Date(Date.now() + 1000 * 3600 * 24).toISOString();
    await repository.updateSettings('event-1', { window_open_at: futureDate });
    const infoFuture = await service.getPublicGuestbookInfo(gb.public_token);
    assert.equal(infoFuture?.isOpen, false);
    assert.match(infoFuture?.reasonClosed || '', /pas encore ouvert/);

    // Sécurité serveur : empêcher un POST direct quand la fenêtre est fermée
    await assert.rejects(
      () => service.submitTextEntry(gb.public_token, { guest_name: 'Alice', body: 'Coucou !' }),
      /pas encore ouvert/
    );

    // Fenêtre fermée : date de fermeture passée
    const pastDate = new Date(Date.now() - 1000 * 3600).toISOString();
    await repository.updateSettings('event-1', { window_open_at: null, window_close_at: pastDate });
    const infoPast = await service.getPublicGuestbookInfo(gb.public_token);
    assert.equal(infoPast?.isOpen, false);
    assert.match(infoPast?.reasonClosed || '', /terminée/);

    await assert.rejects(
      () =>
        service.submitAudioEntry(gb.public_token, {
          guest_name: 'Alice',
          duration_sec: 10,
          waveform: [0.5],
          audio_base64: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8=',
          mime_type: 'audio/webm',
          size_bytes: 1024,
        }),
      /terminée/
    );

    // Token inconnu
    const unknownInfo = await service.getPublicGuestbookInfo('token-inconnu');
    assert.equal(unknownInfo, null);
  });

  await t.test('4. submitTextEntry - Validation des champs et soumission réussie', async () => {
    const gb = await service.getOrCreateGuestbook('event-text', 'owner-text');

    // Soumission valide
    const result = await service.submitTextEntry(gb.public_token, {
      guest_name: 'Sophie & Marc',
      body: 'Tous nos vœux de bonheur pour cette journée inoubliable !',
    });
    assert.ok(result.id, 'Un ID d’entrée doit être généré');

    // Vérifier l'entrée en base
    const entry = await repository.getById(result.id);
    assert.ok(entry);
    assert.equal(entry.guest_name, 'Sophie & Marc');
    assert.equal(entry.type, 'text');
    assert.equal(entry.status, 'ready');
    assert.equal(entry.hidden, false);
    assert.equal(entry.favorite, false);
    assert.equal(entry.guestbook_id, 'event-text');
    assert.equal(entry.owner_id, 'owner-text');

    // Rejet nom trop court
    await assert.rejects(
      () => service.submitTextEntry(gb.public_token, { guest_name: 'A', body: 'Félicitations' }),
      /prénom ou nom/
    );

    // Rejet corps trop court
    await assert.rejects(
      () => service.submitTextEntry(gb.public_token, { guest_name: 'Sophie', body: 'Ok' }),
      /trop court/
    );

    // Rejet corps dépassant 2000 caractères
    const longBody = 'A'.repeat(2001);
    await assert.rejects(
      () => service.submitTextEntry(gb.public_token, { guest_name: 'Sophie', body: longBody }),
      /limite autorisée de 2000 caractères/
    );

    // Rejet token invalide
    await assert.rejects(
      () => service.submitTextEntry('bad-token', { guest_name: 'Sophie', body: 'Bravo' }),
      /invalide ou expiré/
    );
  });

  await t.test('5. submitAudioEntry - Validation durée, quota Mo et normalisation waveform', async () => {
    const gb = await service.getOrCreateGuestbook('event-audio', 'owner-audio');

    // Soumission audio valide avec waveform brute
    const rawWaveform = [0.1, 0.5, 1.2, -0.4, 0.8]; // Contient des valeurs hors bornes
    const sampleDataUri = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8=';
    const result = await service.submitAudioEntry(gb.public_token, {
      guest_name: 'Tonton Daniel',
      duration_sec: 45,
      waveform: rawWaveform,
      audio_base64: sampleDataUri,
      mime_type: 'audio/webm',
      size_bytes: 10240,
    });

    const entry = await repository.getById(result.id);
    assert.ok(entry);
    assert.equal(entry.type, 'audio');
    assert.equal(entry.duration_sec, 45);
    assert.equal(entry.audio_path, sampleDataUri, 'Une data URI compacte est conservée pour lecture directe');

    // Vérifier la normalisation entre 0 et 1 de la waveform
    assert.ok(entry.waveform);
    for (const val of entry.waveform) {
      assert.ok(val >= 0 && val <= 1, `La valeur ${val} doit être normalisée entre 0 et 1`);
    }

    // Rejet si durée dépasse la limite paramétrée (+5s de tolérance)
    await assert.rejects(
      () =>
        service.submitAudioEntry(gb.public_token, {
          guest_name: 'Tonton Daniel',
          duration_sec: 130, // max par défaut = 120s
          waveform: [0.5],
          audio_base64: sampleDataUri,
          mime_type: 'audio/webm',
          size_bytes: 5000,
        }),
      /dépasse la limite/
    );

    // Rejet si taille dépasse max_audio_mb (par défaut 15 Mo)
    await assert.rejects(
      () =>
        service.submitAudioEntry(gb.public_token, {
          guest_name: 'Tonton Daniel',
          duration_sec: 30,
          waveform: [0.5],
          audio_base64: sampleDataUri,
          mime_type: 'audio/webm',
          size_bytes: 20 * 1024 * 1024, // 20 Mo > 15 Mo
        }),
      /taille maximale autorisée/
    );

    // Rejet si audio_base64 est vide
    await assert.rejects(
      () =>
        service.submitAudioEntry(gb.public_token, {
          guest_name: 'Tonton Daniel',
          duration_sec: 10,
          waveform: [0.5],
          audio_base64: '',
          mime_type: 'audio/webm',
          size_bytes: 0,
        }),
      /audio manquant/
    );
  });

  await t.test('6. getEntryForPublicToken - Scan de mini QR code du livre imprimé', async () => {
    const gb = await service.getOrCreateGuestbook('event-scan', 'owner-scan');

    const { id: entryId } = await service.submitAudioEntry(gb.public_token, {
      guest_name: 'Mamy Hélène',
      duration_sec: 25,
      waveform: [0.3, 0.4],
      audio_base64: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8=',
      mime_type: 'audio/webm',
      size_bytes: 5000,
    });

    // 1. Accès réussi
    const fetched = await service.getEntryForPublicToken(gb.public_token, entryId);
    assert.ok(fetched);
    assert.equal(fetched.guest_name, 'Mamy Hélène');

    // 2. Accès refusé si l'entrée a été masquée par les mariés
    await repository.toggleHidden(entryId, true);
    const hiddenFetched = await service.getEntryForPublicToken(gb.public_token, entryId);
    assert.equal(hiddenFetched, null, 'Une entrée masquée ne doit pas être retournée au scan public');

    // 3. Accès refusé si mauvais token
    const wrongTokenFetched = await service.getEntryForPublicToken('wrong-token', entryId);
    assert.equal(wrongTokenFetched, null);
  });

  await t.test('7. Modération et compteurs', async () => {
    const gb = await service.getOrCreateGuestbook('event-mod', 'owner-mod');

    const { id: id1 } = await service.submitTextEntry(gb.public_token, {
      guest_name: 'Ami 1',
      body: 'Message 1',
    });
    const { id: id2 } = await service.submitAudioEntry(gb.public_token, {
      guest_name: 'Ami 2',
      duration_sec: 15,
      waveform: [0.2],
      audio_base64: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8=',
      mime_type: 'audio/webm',
      size_bytes: 1000,
    });

    // Compteurs initiaux
    let counts = await repository.countByGuestbookId('event-mod');
    assert.equal(counts.total, 2);
    assert.equal(counts.text, 1);
    assert.equal(counts.audio, 1);
    assert.equal(counts.favorites, 0);

    // Mise en favori
    await repository.toggleFavorite(id1, true);
    counts = await repository.countByGuestbookId('event-mod');
    assert.equal(counts.favorites, 1);

    // Masquage
    await repository.toggleHidden(id2, true);
    counts = await repository.countByGuestbookId('event-mod');
    assert.equal(counts.total, 1, 'L’élément masqué ne doit plus compter dans les visibles');
    assert.equal(counts.audio, 0);

    // Suppression
    await repository.deleteEntry(id1);
    counts = await repository.countByGuestbookId('event-mod');
    assert.equal(counts.total, 0);
  });

  await t.test('8. Personnalisation de la page invité : image + textes, défauts conservés', async () => {
    const gb = await service.getOrCreateGuestbook('event-page', 'owner-page', 'Le Livre d’Or de Sophie & Thomas');

    // Sans personnalisation : image par défaut + textes par défaut
    let info = await service.getPublicGuestbookInfo(gb.public_token);
    assert.equal(info?.cover_url, DEFAULT_GUESTBOOK_COVER);
    assert.equal(info?.page.subtitle, GUESTBOOK_PAGE_DEFAULTS.subtitle);

    // Le couple change l'image + un texte : seuls ces champs changent
    await service.updatePageContent('event-page', {
      cover_url: 'https://res.cloudinary.com/demo/image/upload/couple.jpg',
      subtitle: '  Un mot pour nous ?  ',
    });
    info = await service.getPublicGuestbookInfo(gb.public_token);
    assert.equal(info?.cover_url, 'https://res.cloudinary.com/demo/image/upload/couple.jpg');
    assert.equal(info?.page.subtitle, 'Un mot pour nous ?', 'texte nettoyé (trim)');
    assert.equal(info?.page.eyebrow, GUESTBOOK_PAGE_DEFAULTS.eyebrow, 'les autres textes gardent leur défaut');

    // Retour à l'image par défaut
    await service.updatePageContent('event-page', { cover_url: null });
    info = await service.getPublicGuestbookInfo(gb.public_token);
    assert.equal(info?.cover_url, DEFAULT_GUESTBOOK_COVER);
  });

  await t.test('9. Personnalisation : refus des URLs dangereuses, champ vidé = texte par défaut', async () => {
    await service.getOrCreateGuestbook('event-sec', 'owner-sec');
    await assert.rejects(() => service.updatePageContent('event-sec', { cover_url: 'javascript:alert(1)' }), /Image invalide/);
    await assert.rejects(() => service.updatePageContent('event-sec', { cover_url: 'data:image/png;base64,AAAA' }), /Image invalide/);
    await assert.rejects(() => service.updatePageContent('event-sec', { cover_url: '//evil.com/x.jpg' }), /Image invalide/);

    const out = await service.updatePageContent('event-sec', { submit_label: '   ', eyebrow: 'x'.repeat(500), inconnu: 'zz' } as never);
    assert.equal(out.submit_label, GUESTBOOK_PAGE_DEFAULTS.submit_label, 'vide → défaut');
    assert.equal(out.eyebrow?.length, 60, 'longueur plafonnée');
    assert.ok(!('inconnu' in out), 'champs inconnus ignorés');
  });

  await t.test('10. Carte de table : design validé, nombre de cartes borné, couleurs contrôlées', async () => {
    const gb = await service.getOrCreateGuestbook('event-card', 'owner-card');
    await service.updateCardDesign('event-card', {
      table_word: 'tablée',
      table_count: 999,
      ink: 'bordeaux',
      paper: 'ivoire',
      section_lines: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    const stored = (await repository.getByEventId('event-card'))!.card!;
    assert.equal(stored.table_count, CARD_TABLE_COUNT_MAX);
    assert.equal(stored.ink, 'bordeaux');
    assert.equal(stored.section_lines?.length, 4, '4 lignes max');

    const bad = await service.updateCardDesign('event-card', { ink: 'fluo' as never, paper: 'x' as never });
    assert.deepEqual(bad, {}, 'couleurs inconnues ignorées');

    const design = resolveCardDesign(gb.card ? gb.card : stored, { names: 'Sophie + Thomas', place: 'Château', date: '15 septembre 2026' });
    assert.equal(design.names, 'Sophie + Thomas', 'noms vides → issus du mariage');
    assert.equal(design.place_line, 'Château');
  });

  await t.test('11. Renommer le livre d’or', async () => {
    await service.getOrCreateGuestbook('event-title', 'owner-title', 'Ancien titre');
    await service.updateTitle('event-title', '  Notre   grand jour  ');
    assert.equal((await repository.getByEventId('event-title'))!.title, 'Notre grand jour');
    await assert.rejects(() => service.updateTitle('event-title', '   '), /ne peut pas être vide/);
  });
});
