import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
import { CATEGORIES, type DayKey, type TimelineItem } from '@/features/day-plan/domain/types';

const PLAYLISTS_COLLECTION = 'playlists';
const TRACKS_SUBCOLLECTION = 'tracks';
const DAY_PLANS_COLLECTION = 'day_plans';

export class FirestorePlaylistRepository
  implements PlaylistReader, PlaylistWriter, TrackRepository, DayPlanMomentReader
{
  // --- PlaylistReader & PlaylistWriter ---

  async getByEventId(eventId: string): Promise<WeddingPlaylist | null> {
    const snap = await getDoc(doc(db, PLAYLISTS_COLLECTION, eventId));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      event_id: String(data.event_id ?? eventId),
      owner_id: String(data.owner_id ?? ''),
      sections: Array.isArray(data.sections) ? (data.sections as PlaylistSection[]) : [],
      dj_share_token: data.dj_share_token ? String(data.dj_share_token) : null,
      dj_token_revoked_at: data.dj_token_revoked_at ? String(data.dj_token_revoked_at) : null,
      updated_at: String(data.updated_at ?? ''),
    };
  }

  async getByDjToken(token: string): Promise<WeddingPlaylist | null> {
    const q = query(
      collection(db, PLAYLISTS_COLLECTION),
      where('dj_share_token', '==', token)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data();

    // Si le token a été révoqué, considérer comme inexistant
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

  async create(playlist: WeddingPlaylist): Promise<WeddingPlaylist> {
    const ref = doc(db, PLAYLISTS_COLLECTION, playlist.event_id);
    await setDoc(ref, {
      event_id: playlist.event_id,
      owner_id: playlist.owner_id,
      sections: playlist.sections,
      dj_share_token: playlist.dj_share_token ?? null,
      dj_token_revoked_at: playlist.dj_token_revoked_at ?? null,
      updated_at: playlist.updated_at,
    });
    return playlist;
  }

  async updateSections(
    eventId: string,
    sections: PlaylistSection[],
    updatedAt: string
  ): Promise<void> {
    const ref = doc(db, PLAYLISTS_COLLECTION, eventId);
    await updateDoc(ref, {
      sections,
      updated_at: updatedAt,
    });
  }

  async updateDjToken(
    eventId: string,
    token: string | null,
    revokedAt: string | null,
    updatedAt: string
  ): Promise<void> {
    const ref = doc(db, PLAYLISTS_COLLECTION, eventId);
    await updateDoc(ref, {
      dj_share_token: token,
      dj_token_revoked_at: revokedAt,
      updated_at: updatedAt,
    });
  }

  // --- TrackRepository ---

  private tracksCol(eventId: string) {
    return collection(db, PLAYLISTS_COLLECTION, eventId, TRACKS_SUBCOLLECTION);
  }

  async listTracksByEventId(eventId: string): Promise<PlaylistTrack[]> {
    const q = query(this.tracksCol(eventId), orderBy('order', 'asc'));
    const snap = await getDocs(q);

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

  async listTracksBySection(
    eventId: string,
    sectionId: string
  ): Promise<PlaylistTrack[]> {
    const q = query(
      this.tracksCol(eventId),
      where('section_id', '==', sectionId),
      orderBy('order', 'asc')
    );
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        section_id: String(data.section_id ?? sectionId),
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

  async addTrack(
    eventId: string,
    track: Omit<PlaylistTrack, 'id'>
  ): Promise<PlaylistTrack> {
    const docRef = await addDoc(this.tracksCol(eventId), {
      section_id: track.section_id,
      title: track.title,
      artist: track.artist,
      spotify_id: track.spotify_id ?? null,
      preview_url: track.preview_url ?? null,
      cover_url: track.cover_url ?? null,
      canvas_url: track.canvas_url ?? null,
      cue_time: track.cue_time ?? null,
      notes: track.notes ?? null,
      flag: track.flag,
      order: track.order,
      created_at: track.created_at,
    });

    return {
      id: docRef.id,
      ...track,
    };
  }

  async updateTrack(
    eventId: string,
    trackId: string,
    patch: Partial<Omit<PlaylistTrack, 'id' | 'created_at'>>
  ): Promise<void> {
    const ref = doc(this.tracksCol(eventId), trackId);
    const updateData: Record<string, any> = {};

    if (patch.section_id !== undefined) updateData.section_id = patch.section_id;
    if (patch.title !== undefined) updateData.title = patch.title;
    if (patch.artist !== undefined) updateData.artist = patch.artist;
    if (patch.spotify_id !== undefined) updateData.spotify_id = patch.spotify_id;
    if (patch.preview_url !== undefined) updateData.preview_url = patch.preview_url;
    if (patch.cover_url !== undefined) updateData.cover_url = patch.cover_url;
    if (patch.canvas_url !== undefined) updateData.canvas_url = patch.canvas_url;
    if (patch.cue_time !== undefined) updateData.cue_time = patch.cue_time;
    if (patch.notes !== undefined) updateData.notes = patch.notes;
    if (patch.flag !== undefined) updateData.flag = patch.flag;
    if (patch.order !== undefined) updateData.order = patch.order;

    await updateDoc(ref, updateData);
  }

  async removeTrack(eventId: string, trackId: string): Promise<void> {
    const ref = doc(this.tracksCol(eventId), trackId);
    await deleteDoc(ref);
  }

  async batchUpdateTrackOrders(
    eventId: string,
    updates: Array<{ id: string; order: number; section_id?: string }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const batch = writeBatch(db);
    for (const update of updates) {
      const ref = doc(this.tracksCol(eventId), update.id);
      const data: Record<string, any> = { order: update.order };
      if (update.section_id) {
        data.section_id = update.section_id;
      }
      batch.update(ref, data);
    }
    await batch.commit();
  }

  // --- DayPlanMomentReader ---

  async listMusicalMoments(eventId: string): Promise<DayPlanMomentRef[]> {
    try {
      const snap = await getDoc(doc(db, DAY_PLANS_COLLECTION, eventId));
      if (!snap.exists()) return [];

      const data = snap.data();
      const days = data?.days;
      if (!days || typeof days !== 'object') return [];

      const moments: DayPlanMomentRef[] = [];
      const dayKeys: DayKey[] = ['eve', 'day', 'after'];

      for (const key of dayKeys) {
        const block = days[key];
        if (!block || !Array.isArray(block.items)) continue;

        for (const item of block.items as TimelineItem[]) {
          if (!item || !item.id || !item.title) continue;

          // Si la catégorie est musicale
          const categoryMeta = CATEGORIES[item.category];
          const isMusical = categoryMeta ? categoryMeta.musical : false;

          if (isMusical) {
            moments.push({
              id: item.id,
              title: item.title,
              start_at: item.start_at,
              category: item.category,
              location_name: item.location?.name,
            });
          }
        }
      }

      // Trier chronologiquement par start_at
      return moments.sort((a, b) => a.start_at.localeCompare(b.start_at));
    } catch (err) {
      console.warn('Impossible de charger les moments du planning pour la playlist:', err);
      return [];
    }
  }
}
