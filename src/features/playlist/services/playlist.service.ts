import {
  computePlaylistStats,
  createDefaultSections,
  validateSectionLabel,
  validateTrackInput,
} from '../domain/playlist-rules';
import type {
  DayPlanMomentRef,
  PlaylistSection,
  PlaylistStats,
  PlaylistTrack,
  TrackFlag,
  WeddingPlaylist,
} from '../domain/types';
import type {
  DayPlanMomentReader,
  PlaylistReader,
  PlaylistWriter,
  TrackRepository,
} from '../repositories/playlist.repository.interface';

export interface PlaylistServiceDeps {
  reader: PlaylistReader;
  writer: PlaylistWriter;
  tracks: TrackRepository;
  moments: DayPlanMomentReader;
}

export interface AddTrackInput {
  section_id: string;
  title: string;
  artist: string;
  spotify_id?: string | null;
  preview_url?: string | null;
  cover_url?: string | null;
  canvas_url?: string | null;
  flag?: TrackFlag;
  cue_time?: string | null;
  notes?: string | null;
}

export interface UpdateTrackPatch {
  section_id?: string;
  title?: string;
  artist?: string;
  preview_url?: string | null;
  cover_url?: string | null;
  canvas_url?: string | null;
  flag?: TrackFlag;
  cue_time?: string | null;
  notes?: string | null;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export class PlaylistService {
  constructor(private readonly deps: PlaylistServiceDeps) {}

  async getOrInitPlaylist(
    eventId: string,
    ownerId: string
  ): Promise<WeddingPlaylist> {
    if (!eventId) throw new Error('Identifiant de mariage requis.');
    if (!ownerId) throw new Error('Identifiant propriétaire requis.');

    const existing = await this.deps.reader.getByEventId(eventId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const initial: WeddingPlaylist = {
      event_id: eventId,
      owner_id: ownerId,
      sections: createDefaultSections(),
      dj_share_token: null,
      dj_token_revoked_at: null,
      updated_at: now,
    };
    return this.deps.writer.create(initial);
  }

  async addSection(
    eventId: string,
    label: string,
    linkedMomentId?: string | null
  ): Promise<PlaylistSection> {
    const playlist = await this.requirePlaylist(eventId);
    const cleanLabel = validateSectionLabel(label);

    const maxOrder = playlist.sections.reduce(
      (acc, s) => Math.max(acc, s.order),
      0
    );
    const newSection: PlaylistSection = {
      id: generateId(),
      label: cleanLabel,
      linked_moment_id: linkedMomentId ?? null,
      order: maxOrder + 1,
    };

    const nextSections = [...playlist.sections, newSection];
    const now = new Date().toISOString();
    await this.deps.writer.updateSections(eventId, nextSections, now);
    return newSection;
  }

  async updateSection(
    eventId: string,
    sectionId: string,
    patch: { label?: string; linked_moment_id?: string | null }
  ): Promise<PlaylistSection[]> {
    const playlist = await this.requirePlaylist(eventId);
    const nextSections = playlist.sections.map((sec) => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        label: patch.label !== undefined ? validateSectionLabel(patch.label) : sec.label,
        linked_moment_id:
          patch.linked_moment_id !== undefined
            ? patch.linked_moment_id
            : sec.linked_moment_id,
      };
    });

    const now = new Date().toISOString();
    await this.deps.writer.updateSections(eventId, nextSections, now);
    return nextSections;
  }

  async removeSection(
    eventId: string,
    sectionId: string
  ): Promise<PlaylistSection[]> {
    const playlist = await this.requirePlaylist(eventId);
    if (playlist.sections.length <= 1) {
      throw new Error('La playlist doit comporter au moins une section.');
    }

    // Supprimer ou réassigner les morceaux de cette section ?
    // On supprime les morceaux associés
    const sectionTracks = await this.deps.tracks.listTracksBySection(
      eventId,
      sectionId
    );
    for (const t of sectionTracks) {
      await this.deps.tracks.removeTrack(eventId, t.id);
    }

    const filtered = playlist.sections
      .filter((s) => s.id !== sectionId)
      .map((s, index) => ({ ...s, order: index + 1 }));

    const now = new Date().toISOString();
    await this.deps.writer.updateSections(eventId, filtered, now);
    return filtered;
  }

  async listTracks(eventId: string): Promise<PlaylistTrack[]> {
    return this.deps.tracks.listTracksByEventId(eventId);
  }

  async listTracksForSection(
    eventId: string,
    sectionId: string
  ): Promise<PlaylistTrack[]> {
    return this.deps.tracks.listTracksBySection(eventId, sectionId);
  }

  async addTrack(
    eventId: string,
    input: AddTrackInput
  ): Promise<PlaylistTrack> {
    const playlist = await this.requirePlaylist(eventId);
    const sectionExists = playlist.sections.some(
      (s) => s.id === input.section_id
    );
    if (!sectionExists) {
      throw new Error('Section introuvable.');
    }

    const validated = validateTrackInput(
      input.title,
      input.artist,
      input.cue_time,
      input.notes
    );

    const existingSectionTracks = await this.deps.tracks.listTracksBySection(
      eventId,
      input.section_id
    );
    const nextOrder = existingSectionTracks.length + 1;

    const newTrack = await this.deps.tracks.addTrack(eventId, {
      section_id: input.section_id,
      title: validated.title,
      artist: validated.artist,
      spotify_id: input.spotify_id ?? null,
      preview_url: input.preview_url ?? null,
      cover_url: input.cover_url ?? null,
      canvas_url: input.canvas_url ?? null,
      flag: input.flag ?? 'normal',
      order: nextOrder,
      cue_time: validated.cue_time,
      notes: validated.notes,
      created_at: new Date().toISOString(),
    });

    return newTrack;
  }

  async updateTrack(
    eventId: string,
    trackId: string,
    patch: UpdateTrackPatch
  ): Promise<void> {
    const cleanPatch: Partial<Omit<PlaylistTrack, 'id' | 'created_at'>> = {};

    if (patch.title !== undefined || patch.artist !== undefined) {
      const allTracks = await this.deps.tracks.listTracksByEventId(eventId);
      const existing = allTracks.find((t) => t.id === trackId);
      if (!existing) throw new Error('Morceau introuvable.');

      const validated = validateTrackInput(
        patch.title ?? existing.title,
        patch.artist ?? existing.artist,
        patch.cue_time !== undefined ? patch.cue_time : existing.cue_time,
        patch.notes !== undefined ? patch.notes : existing.notes
      );
      cleanPatch.title = validated.title;
      cleanPatch.artist = validated.artist;
      cleanPatch.cue_time = validated.cue_time;
      cleanPatch.notes = validated.notes;
    } else {
      if (patch.cue_time !== undefined) {
        cleanPatch.cue_time = (patch.cue_time ?? '').trim() || null;
      }
      if (patch.notes !== undefined) {
        cleanPatch.notes = (patch.notes ?? '').trim() || null;
      }
    }

    if (patch.section_id !== undefined) cleanPatch.section_id = patch.section_id;
    if (patch.preview_url !== undefined) cleanPatch.preview_url = patch.preview_url;
    if (patch.cover_url !== undefined) cleanPatch.cover_url = patch.cover_url;
    if (patch.canvas_url !== undefined) cleanPatch.canvas_url = patch.canvas_url;
    if (patch.flag !== undefined) cleanPatch.flag = patch.flag;

    await this.deps.tracks.updateTrack(eventId, trackId, cleanPatch);
  }

  async removeTrack(eventId: string, trackId: string): Promise<void> {
    await this.deps.tracks.removeTrack(eventId, trackId);
  }

  async reorderTracks(
    eventId: string,
    sectionId: string,
    orderedTrackIds: string[]
  ): Promise<void> {
    const updates = orderedTrackIds.map((id, index) => ({
      id,
      order: index + 1,
      section_id: sectionId,
    }));
    await this.deps.tracks.batchUpdateTrackOrders(eventId, updates);
  }

  async generateDjShareToken(eventId: string): Promise<string> {
    const token = generateId();
    const now = new Date().toISOString();
    await this.deps.writer.updateDjToken(eventId, token, null, now);
    return token;
  }

  async revokeDjShareToken(eventId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.deps.writer.updateDjToken(eventId, null, now, now);
  }

  async listMusicalMoments(eventId: string): Promise<DayPlanMomentRef[]> {
    return this.deps.moments.listMusicalMoments(eventId);
  }

  async getPlaylistStats(eventId: string): Promise<PlaylistStats> {
    const all = await this.deps.tracks.listTracksByEventId(eventId);
    return computePlaylistStats(all);
  }

  async getPublicDjPlaylist(
    token: string
  ): Promise<{ playlist: WeddingPlaylist; tracks: PlaylistTrack[] } | null> {
    const playlist = await this.deps.reader.getByDjToken(token);
    if (!playlist) return null;
    if (playlist.dj_token_revoked_at) return null;

    const tracks = await this.deps.tracks.listTracksByEventId(playlist.event_id);
    return { playlist, tracks };
  }

  private async requirePlaylist(eventId: string): Promise<WeddingPlaylist> {
    const playlist = await this.deps.reader.getByEventId(eventId);
    if (!playlist) {
      throw new Error('Playlist introuvable pour cet événement.');
    }
    return playlist;
  }
}
