import { adminDb } from '@/lib/firebase-admin';
import type {
  PlaylistSection,
  PlaylistTrack,
  WeddingPlaylist,
} from '../domain/types';
import type {
  PlaylistReader,
  TrackRepository,
} from './playlist.repository.interface';

const PLAYLISTS_COLLECTION = 'playlists';
const TRACKS_SUBCOLLECTION = 'tracks';

export interface EventInfo {
  couple_names: string;
  wedding_date?: string;
  venue_name?: string;
}

export class AdminPlaylistRepository implements Pick<PlaylistReader, 'getByDjToken'>, Pick<TrackRepository, 'listTracksByEventId'> {
  async getByDjToken(token: string): Promise<WeddingPlaylist | null> {
    const snap = await adminDb
      .collection(PLAYLISTS_COLLECTION)
      .where('dj_share_token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    if (data.dj_token_revoked_at) return null;

    return {
      event_id: String(data.event_id ?? docSnap.id),
      owner_id: String(data.owner_id ?? ''),
      sections: Array.isArray(data.sections) ? (data.sections as PlaylistSection[]) : [],
      dj_share_token: String(data.dj_share_token),
      dj_token_revoked_at: null,
      updated_at: String(data.updated_at ?? ''),
    };
  }

  async listTracksByEventId(eventId: string): Promise<PlaylistTrack[]> {
    const snap = await adminDb
      .collection(PLAYLISTS_COLLECTION)
      .doc(eventId)
      .collection(TRACKS_SUBCOLLECTION)
      .orderBy('order', 'asc')
      .get();

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        section_id: String(data.section_id ?? ''),
        title: String(data.title ?? ''),
        artist: String(data.artist ?? ''),
        spotify_id: data.spotify_id ? String(data.spotify_id) : null,
        preview_url: data.preview_url ? String(data.preview_url) : null,
        cover_url: data.cover_url ? String(data.cover_url) : null,
        canvas_url: data.canvas_url ? String(data.canvas_url) : null,
        cue_time: data.cue_time ? String(data.cue_time) : (data.cue_seconds ? String(data.cue_seconds) : null),
        notes: data.notes ? String(data.notes) : (data.note ? String(data.note) : null),
        flag: (['normal', 'must_play', 'banned'].includes(data.flag) ? data.flag : 'normal') as PlaylistTrack['flag'],
        order: Number(data.order ?? 0),
        created_at: String(data.created_at ?? ''),
      };
    });
  }

  async getEventInfo(eventId: string): Promise<EventInfo> {
    try {
      const snap = await adminDb.collection('events').doc(eventId).get();
      if (!snap.exists) return { couple_names: '' };
      const data = snap.data();
      return {
        couple_names: String(data?.couple_names ?? data?.title ?? ''),
        wedding_date: data?.date ? String(data.date) : undefined,
        venue_name: data?.venue ? String(data.venue) : undefined,
      };
    } catch {
      return { couple_names: '' };
    }
  }
}
