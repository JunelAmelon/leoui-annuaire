import type {
  DayPlanMomentRef,
  PlaylistSection,
  PlaylistTrack,
  WeddingPlaylist,
} from '../domain/types';

export interface PlaylistReader {
  getByEventId(eventId: string): Promise<WeddingPlaylist | null>;
  getByDjToken(token: string): Promise<WeddingPlaylist | null>;
}

export interface PlaylistWriter {
  create(playlist: WeddingPlaylist): Promise<WeddingPlaylist>;
  updateSections(
    eventId: string,
    sections: PlaylistSection[],
    updatedAt: string
  ): Promise<void>;
  updateDjToken(
    eventId: string,
    token: string | null,
    revokedAt: string | null,
    updatedAt: string
  ): Promise<void>;
}

export interface TrackRepository {
  listTracksByEventId(eventId: string): Promise<PlaylistTrack[]>;
  listTracksBySection(
    eventId: string,
    sectionId: string
  ): Promise<PlaylistTrack[]>;
  addTrack(
    eventId: string,
    track: Omit<PlaylistTrack, 'id'>
  ): Promise<PlaylistTrack>;
  updateTrack(
    eventId: string,
    trackId: string,
    patch: Partial<Omit<PlaylistTrack, 'id' | 'created_at'>>
  ): Promise<void>;
  removeTrack(eventId: string, trackId: string): Promise<void>;
  batchUpdateTrackOrders(
    eventId: string,
    updates: Array<{ id: string; order: number; section_id?: string }>
  ): Promise<void>;
}

export interface DayPlanMomentReader {
  listMusicalMoments(eventId: string): Promise<DayPlanMomentRef[]>;
}
