export type TrackFlag = 'normal' | 'must_play' | 'banned';

export interface PlaylistSection {
  id: string;
  label: string;
  linked_moment_id: string | null;
  order: number;
}

export interface PlaylistTrack {
  id: string;
  section_id: string;
  title: string;
  artist: string;
  spotify_id: string | null;
  preview_url: string | null;
  cover_url: string | null;
  canvas_url: string | null;
  flag: TrackFlag;
  order: number;
  cue_time: string | null;
  notes: string | null;
  created_at: string;
}

export interface WeddingPlaylist {
  event_id: string;
  owner_id: string;
  sections: PlaylistSection[];
  dj_share_token: string | null;
  dj_token_revoked_at: string | null;
  updated_at: string;
}

export interface DayPlanMomentRef {
  id: string;
  title: string;
  start_at: string;
  category: string;
  location_name?: string;
}

export interface PlaylistStats {
  total: number;
  must_play: number;
  banned: number;
  normal: number;
}
