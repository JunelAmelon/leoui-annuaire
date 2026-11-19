import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryPlaylistRepository } from '../repositories/in-memory-playlist.repository';
import { PlaylistService } from './playlist.service';
import { computePlaylistStats } from '../domain/playlist-rules';

function createService() {
  const repo = new InMemoryPlaylistRepository();
  const service = new PlaylistService({
    reader: repo,
    writer: repo,
    tracks: repo,
    moments: repo,
  });
  return { repo, service };
}

describe('PlaylistService - Unit Tests', () => {
  it('1. Initialise une playlist avec les 6 sections par défaut', async () => {
    const { service } = createService();
    const playlist = await service.getOrInitPlaylist('evt_play_1', 'user_1');

    assert.equal(playlist.event_id, 'evt_play_1');
    assert.equal(playlist.owner_id, 'user_1');
    assert.equal(playlist.sections.length, 6);
    assert.equal(playlist.sections[0].id, 'cocktail');
    assert.equal(playlist.sections[1].id, 'entree');
  });

  it('2. Ajoute et valide un morceau dans une section', async () => {
    const { service } = createService();
    await service.getOrInitPlaylist('evt_play_2', 'user_1');

    const track = await service.addTrack('evt_play_2', {
      section_id: 'ouverture',
      title: 'You Are The Best Thing',
      artist: 'Ray LaMontagne',
      flag: 'must_play',
      cue_time: '0:38',
      notes: 'Lancer au refrain dès que les mariés entrent sur la piste',
      cover_url: 'https://example.com/cover.jpg',
    });

    assert.ok(track.id);
    assert.equal(track.title, 'You Are The Best Thing');
    assert.equal(track.flag, 'must_play');
    assert.equal(track.cue_time, '0:38');

    const tracks = await service.listTracksForSection('evt_play_2', 'ouverture');
    assert.equal(tracks.length, 1);
    assert.equal(tracks[0].id, track.id);
  });

  it('3. Rejette un titre ou artiste vide', async () => {
    const { service } = createService();
    await service.getOrInitPlaylist('evt_play_3', 'user_1');

    await assert.rejects(
      () =>
        service.addTrack('evt_play_3', {
          section_id: 'ouverture',
          title: '   ',
          artist: 'Artiste',
        }),
      /obligatoire/
    );

    await assert.rejects(
      () =>
        service.addTrack('evt_play_3', {
          section_id: 'ouverture',
          title: 'Titre',
          artist: '',
        }),
      /obligatoire/
    );
  });

  it('4. Met à jour un morceau et modifie son statut (ex: normal -> banned)', async () => {
    const { service } = createService();
    await service.getOrInitPlaylist('evt_play_4', 'user_1');

    const track = await service.addTrack('evt_play_4', {
      section_id: 'soiree',
      title: 'La Chenille',
      artist: 'Variétés',
      flag: 'normal',
    });

    await service.updateTrack('evt_play_4', track.id, {
      flag: 'banned',
      notes: 'Ne jamais jouer, demande expresse de la mariée',
    });

    const list = await service.listTracksForSection('evt_play_4', 'soiree');
    assert.equal(list[0].flag, 'banned');
    assert.equal(list[0].notes, 'Ne jamais jouer, demande expresse de la mariée');
  });

  it('5. Calcule les statistiques de la playlist (total, incontournables, blacklist)', async () => {
    const { service } = createService();
    await service.getOrInitPlaylist('evt_play_5', 'user_1');

    await service.addTrack('evt_play_5', {
      section_id: 'entree',
      title: 'Morceau 1',
      artist: 'Artiste 1',
      flag: 'must_play',
    });
    await service.addTrack('evt_play_5', {
      section_id: 'entree',
      title: 'Morceau 2',
      artist: 'Artiste 2',
      flag: 'normal',
    });
    await service.addTrack('evt_play_5', {
      section_id: 'soiree',
      title: 'Morceau 3',
      artist: 'Artiste 3',
      flag: 'banned',
    });

    const stats = await service.getPlaylistStats('evt_play_5');
    assert.equal(stats.total, 3);
    assert.equal(stats.must_play, 1);
    assert.equal(stats.normal, 1);
    assert.equal(stats.banned, 1);
  });

  it('6. Génère et révoque un jeton de partage pour le DJ', async () => {
    const { service } = createService();
    await service.getOrInitPlaylist('evt_play_6', 'user_1');

    const token = await service.generateDjShareToken('evt_play_6');
    assert.ok(token);

    const publicData = await service.getPublicDjPlaylist(token);
    assert.ok(publicData);
    assert.equal(publicData.playlist.event_id, 'evt_play_6');

    await service.revokeDjShareToken('evt_play_6');
    const revokedData = await service.getPublicDjPlaylist(token);
    assert.equal(revokedData, null);
  });

  it('7. Lie une section à un moment du jour J', async () => {
    const { repo, service } = createService();
    repo.seedMoments('evt_play_7', [
      {
        id: 'moment_123',
        title: 'Ouverture du bal officielle',
        start_at: '2026-09-12T23:30:00',
        category: 'party',
      },
    ]);

    await service.getOrInitPlaylist('evt_play_7', 'user_1');
    const updatedSections = await service.updateSection(
      'evt_play_7',
      'ouverture',
      { linked_moment_id: 'moment_123' }
    );

    const target = updatedSections.find((s) => s.id === 'ouverture');
    assert.equal(target?.linked_moment_id, 'moment_123');

    const moments = await service.listMusicalMoments('evt_play_7');
    assert.equal(moments.length, 1);
    assert.equal(moments[0].title, 'Ouverture du bal officielle');
  });
});
