export type GuestbookEntryType = 'audio' | 'text';
export type GuestbookEntryStatus = 'pending_upload' | 'ready' | 'rejected';

export interface GuestbookSettings {
  max_duration_sec: number; // Ex: 120 (2 minutes)
  max_audio_mb: number;     // Ex: 15 MB
  window_open_at: string | null;  // Date ISO
  window_close_at: string | null; // Date ISO
}

export interface Guestbook {
  event_id: string; // ID déterministe = event_id
  owner_id: string; // UID du couple propriétaire
  title: string;
  public_token: string;
  token_revoked_at: string | null;
  token_expires_at: string | null;
  settings: GuestbookSettings;
  created_at: string;
  updated_at: string;
}

export interface GuestbookEntry {
  id: string;
  guestbook_id: string; // = event_id
  event_id: string;
  owner_id: string;
  type: GuestbookEntryType;
  status: GuestbookEntryStatus;
  audio_path?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  duration_sec?: number | null;
  waveform?: number[]; // ≤ 100 points normalisés [0, 1]
  body?: string | null; // Max 2000 caractères
  guest_name: string;
  guest_key?: string | null; // Identifiant de session anonyme pour anti-spam
  favorite: boolean;
  hidden: boolean;
  created_at: string;
}

export interface CreateGuestbookInput {
  event_id: string;
  owner_id: string;
  title?: string;
  settings?: Partial<GuestbookSettings>;
}

export interface SubmitTextEntryInput {
  guest_name: string;
  body: string;
  guest_key?: string;
}

export interface SubmitAudioEntryInput {
  guest_name: string;
  duration_sec: number;
  waveform: number[];
  audio_base64: string;
  mime_type: string;
  size_bytes: number;
  guest_key?: string;
}

export const GUESTBOOK_DEFAULTS = {
  MAX_DURATION_SEC: 120, // 2 minutes par vocal
  MAX_AUDIO_MB: 15,
  MAX_BODY_CHARS: 2000,
  WAVEFORM_POINTS: 64, // Nombre de barres d'onde audio (élégant & léger)
};

