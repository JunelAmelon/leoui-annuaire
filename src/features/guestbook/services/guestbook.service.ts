import type {
  Guestbook,
  GuestbookEntry,
  GuestbookSettings,
  SubmitTextEntryInput,
  SubmitAudioEntryInput,
} from '../domain/types';
import { GUESTBOOK_DEFAULTS } from '../domain/types';
import type { IGuestbookRepository } from '../repositories/guestbook.repository.interface';

export class GuestbookService {
  constructor(private readonly repository: IGuestbookRepository) {}

  /**
   * Récupère ou initialise le livre d'or d'un mariage.
   * L'ID du document est strictement l'event_id (schéma déterministe).
   */
  async getOrCreateGuestbook(
    eventId: string,
    ownerId: string,
    defaultTitle = 'Notre Livre d’Or'
  ): Promise<Guestbook> {
    if (!eventId || !ownerId) {
      throw new Error('eventId et ownerId requis pour initialiser le livre d’or.');
    }

    const existing = await this.repository.getByEventId(eventId);
    if (existing) {
      return existing;
    }

    const newGuestbook: Guestbook = {
      event_id: eventId,
      owner_id: ownerId,
      title: defaultTitle,
      public_token: crypto.randomUUID(),
      token_revoked_at: null,
      token_expires_at: null,
      settings: {
        max_duration_sec: GUESTBOOK_DEFAULTS.MAX_DURATION_SEC,
        max_audio_mb: GUESTBOOK_DEFAULTS.MAX_AUDIO_MB,
        window_open_at: null,
        window_close_at: null,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.repository.save(newGuestbook);
    return newGuestbook;
  }

  /**
   * Récupère les données publiques pour un invité arrivant via QR Code / public_token.
   */
  async getPublicGuestbookInfo(token: string): Promise<{
    title: string;
    isOpen: boolean;
    reasonClosed?: string;
    settings: GuestbookSettings;
  } | null> {
    const guestbook = await this.repository.getByPublicToken(token);
    if (!guestbook) return null;

    const now = new Date();
    let isOpen = true;
    let reasonClosed: string | undefined;

    if (guestbook.settings.window_open_at && new Date(guestbook.settings.window_open_at) > now) {
      isOpen = false;
      reasonClosed = 'Le livre d’or n’est pas encore ouvert aux dépôts.';
    } else if (guestbook.settings.window_close_at && new Date(guestbook.settings.window_close_at) < now) {
      isOpen = false;
      reasonClosed = 'La période de dépôt des messages est terminée.';
    }

    return {
      title: guestbook.title,
      isOpen,
      reasonClosed,
      settings: guestbook.settings,
    };
  }

  /**
   * Récupère une entrée spécifique si le token correspond (ex: scan d'un mini QR code du livre imprimé).
   */
  async getEntryForPublicToken(
    token: string,
    entryId: string
  ): Promise<GuestbookEntry | null> {
    const guestbook = await this.repository.getByPublicToken(token);
    if (!guestbook) return null;
    const entry = await this.repository.getById(entryId);
    if (!entry || entry.event_id !== guestbook.event_id || entry.hidden) {
      return null;
    }
    return entry;
  }

  /**
   * Soumission d'un mot doux écrit par un invité.
   */
  async submitTextEntry(
    token: string,
    input: SubmitTextEntryInput
  ): Promise<{ id: string }> {
    const guestbook = await this.repository.getByPublicToken(token);
    if (!guestbook) {
      throw new Error('Lien ou QR Code invalide ou expiré.');
    }

    const name = input.guest_name?.trim();
    if (!name || name.length < 2) {
      throw new Error('Veuillez indiquer votre prénom ou nom.');
    }

    const body = input.body?.trim();
    if (!body || body.length < 3) {
      throw new Error('Votre message est trop court.');
    }

    if (body.length > GUESTBOOK_DEFAULTS.MAX_BODY_CHARS) {
      throw new Error(
        `Votre message dépasse la limite autorisée de ${GUESTBOOK_DEFAULTS.MAX_BODY_CHARS} caractères.`
      );
    }

    const entryId = await this.repository.addEntry({
      guestbook_id: guestbook.event_id,
      event_id: guestbook.event_id,
      owner_id: guestbook.owner_id,
      type: 'text',
      status: 'ready',
      body,
      guest_name: name,
      guest_key: input.guest_key || null,
      favorite: false,
      hidden: false,
      created_at: new Date().toISOString(),
    });

    return { id: entryId };
  }

  /**
   * Soumission d'un message vocal par un invité.
   */
  async submitAudioEntry(
    token: string,
    input: SubmitAudioEntryInput
  ): Promise<{ id: string }> {
    const guestbook = await this.repository.getByPublicToken(token);
    if (!guestbook) {
      throw new Error('Lien ou QR Code invalide ou expiré.');
    }

    const name = input.guest_name?.trim();
    if (!name || name.length < 2) {
      throw new Error('Veuillez indiquer votre prénom ou nom.');
    }

    if (!input.audio_base64) {
      throw new Error('Enregistrement audio manquant.');
    }

    const maxSec = guestbook.settings.max_duration_sec || GUESTBOOK_DEFAULTS.MAX_DURATION_SEC;
    if (input.duration_sec > maxSec + 5) {
      throw new Error(`La durée dépasse la limite de ${maxSec} secondes.`);
    }

    // Normalisation de la forme d'onde (max 100 points)
    const waveform = (input.waveform || []).slice(0, 100).map((v) => Math.max(0, Math.min(1, Number(v) || 0)));

    const entryId = await this.repository.addEntry({
      guestbook_id: guestbook.event_id,
      event_id: guestbook.event_id,
      owner_id: guestbook.owner_id,
      type: 'audio',
      status: 'ready',
      audio_path: `guestbooks/${guestbook.event_id}/audios/${crypto.randomUUID()}.${input.mime_type?.includes('mp4') ? 'm4a' : 'webm'}`,
      mime_type: input.mime_type || 'audio/webm',
      size_bytes: input.size_bytes || 0,
      duration_sec: Math.round(input.duration_sec),
      waveform,
      guest_name: name,
      guest_key: input.guest_key || null,
      favorite: false,
      hidden: false,
      created_at: new Date().toISOString(),
    });

    return { id: entryId };
  }
}

