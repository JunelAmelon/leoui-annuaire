import type {
  DayPlanMomentRef,
  PlaylistSection,
  PlaylistTrack,
  WeddingPlaylist,
} from '../domain/types';
import type {
  DayPlanMomentReader,
  PlaylistReader,
  PlaylistWriter,
  TrackRepository,
} from './playlist.repository.interface';

export class InMemoryPlaylistRepository
  implements PlaylistReader, PlaylistWriter, TrackRepository, DayPlanMomentReader
{
  private playlists = new Map<string, WeddingPlaylist>();
  private tracks = new Map<string, PlaylistTrack[]>();
  private moments = new Map<string, DayPlanMomentRef[]>();
  private seq = 0;

  seedMoments(eventId: string, items: DayPlanMomentRef[]): void {
    this.moments.set(eventId, items.map((m) => ({ ...m })));
  }

  async getByEventId(eventId: string): Promise<WeddingPlaylist | null> {
    const p = this.playlists.get(eventId);
    return p ? structuredClone(p) : null;
  }

  async getByDjToken(token: string): Promise<WeddingPlaylist | null> {
    for (const p of this.playlists.values()) {
      if (p.dj_share_token === token && !p.dj_token_revoked_at) {
        return structuredClone(p);
      }
    }
    return null;
  }

  async create(playlist: WeddingPlaylist): Promise<WeddingPlaylist> {
    const copy = structuredClone(playlist);
    this.playlists.set(playlist.event_id, copy);
    return structuredClone(copy);
  }

  async updateSections(
    eventId: string,
    sections: PlaylistSection[],
    updatedAt: string
  ): Promise<void> {
    const existing = this.playlists.get(eventId);
    if (!existing) throw new Error('Playlist introuvable.');
    existing.sections = structuredClone(sections);
    existing.updated_at = updatedAt;
  }

  async updateDjToken(
    eventId: string,
    token: string | null,
    revokedAt: string | null,
    updatedAt: string
  ): Promise<void> {
    const existing = this.playlists.get(eventId);
    if (!existing) throw new Error('Playlist introuvable.');
    existing.dj_share_token = token;
    existing.dj_token_revoked_at = revokedAt;
    existing.updated_at = updatedAt;
  }

  async listTracksByEventId(eventId: string): Promise<PlaylistTrack[]> {
    return (this.tracks.get(eventId) ?? []).map((t) => ({ ...t }));
  }

  async listTracksBySection(
    eventId: string,
    sectionId: string
  ): Promise<PlaylistTrack[]> {
    const all = this.tracks.get(eventId) ?? [];
    return all
      .filter((t) => t.section_id === sectionId)
      .sort((a, b) => a.order - b.order)
      .map((t) => ({ ...t }));
  }

  async addTrack(
    eventId: string,
    track: Omit<PlaylistTrack, 'id'>
  ): Promise<PlaylistTrack> {
    this.seq += 1;
    const newTrack: PlaylistTrack = {
      id: `trk_${this.seq}`,
      ...track,
    };
    const list = this.tracks.get(eventId) ?? [];
    list.push(newTrack);
    this.tracks.set(eventId, list);
    return { ...newTrack };
  }

  async updateTrack(
    eventId: string,
    trackId: string,
    patch: Partial<Omit<PlaylistTrack, 'id' | 'created_at'>>
  ): Promise<void> {
    const list = this.tracks.get(eventId) ?? [];
    const idx = list.findIndex((t) => t.id === trackId);
    if (idx === 0 || idx > 0) {
      list[idx] = { ...list[idx], ...patch };
      this.tracks.set(eventId, list);
    }
  }

  async removeTrack(eventId: string, trackId: string): Promise<void> {
    const list = this.tracks.get(eventId) ?? [];
    this.tracks.set(
      eventId,
      list.filter((t) => t.id !== trackId)
    );
  }

  async batchUpdateTrackOrders(
    eventId: string,
    updates: Array<{ id: string; order: number; section_id?: string }>
  ): Promise<void> {
    const list = this.tracks.get(eventId) ?? [];
    for (const u of updates) {
      const item = list.find((t) => t.id === u.id);
      if (item) {
        item.order = u.order;
        if (u.section_id) item.section_id = u.section_id;
      }
    }
    this.tracks.set(eventId, list);
  }

  async listMusicalMoments(eventId: string): Promise<DayPlanMomentRef[]> {
    return (this.moments.get(eventId) ?? []).map((m) => ({ ...m }));
  }
}
