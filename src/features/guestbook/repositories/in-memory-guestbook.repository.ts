import type {
  Guestbook,
  GuestbookEntry,
  GuestbookSettings,
} from '../domain/types';
import type {
  IGuestbookRepository,
  ListEntriesOptions,
} from './guestbook.repository.interface';

export class InMemoryGuestbookRepository implements IGuestbookRepository {
  private guestbooks: Map<string, Guestbook> = new Map();
  private entries: Map<string, GuestbookEntry> = new Map();

  async getByEventId(eventId: string): Promise<Guestbook | null> {
    return this.guestbooks.get(eventId) || null;
  }

  async getByPublicToken(token: string): Promise<Guestbook | null> {
    for (const gb of this.guestbooks.values()) {
      if (gb.public_token === token) {
        if (gb.token_revoked_at) return null;
        if (gb.token_expires_at && new Date(gb.token_expires_at) < new Date()) {
          return null;
        }
        return gb;
      }
    }
    return null;
  }

  async save(guestbook: Guestbook): Promise<void> {
    this.guestbooks.set(guestbook.event_id, { ...guestbook });
  }

  async updateSettings(
    eventId: string,
    settings: Partial<GuestbookSettings>
  ): Promise<void> {
    const gb = this.guestbooks.get(eventId);
    if (!gb) return;
    this.guestbooks.set(eventId, {
      ...gb,
      settings: { ...gb.settings, ...settings },
      updated_at: new Date().toISOString(),
    });
  }

  async rotateToken(eventId: string): Promise<string> {
    const gb = this.guestbooks.get(eventId);
    if (!gb) throw new Error('Guestbook introuvable');
    const newToken = 'mock-rotated-token-' + Math.random().toString(36).substring(2);
    this.guestbooks.set(eventId, {
      ...gb,
      public_token: newToken,
      token_revoked_at: null,
      updated_at: new Date().toISOString(),
    });
    return newToken;
  }

  async listByGuestbookId(
    guestbookId: string,
    options: ListEntriesOptions = {}
  ): Promise<GuestbookEntry[]> {
    let result = Array.from(this.entries.values()).filter(
      (e) => e.guestbook_id === guestbookId
    );

    if (!options.includeHidden) {
      result = result.filter((e) => !e.hidden);
    }
    if (options.onlyFavorites) {
      result = result.filter((e) => e.favorite);
    }
    if (options.type) {
      result = result.filter((e) => e.type === options.type);
    }

    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (options.limitCount) {
      result = result.slice(0, options.limitCount);
    }

    return result;
  }

  async getById(id: string): Promise<GuestbookEntry | null> {
    return this.entries.get(id) || null;
  }

  async countByGuestbookId(guestbookId: string): Promise<{
    total: number;
    audio: number;
    text: number;
    favorites: number;
  }> {
    const visible = Array.from(this.entries.values()).filter(
      (e) => e.guestbook_id === guestbookId && !e.hidden
    );

    return {
      total: visible.length,
      audio: visible.filter((e) => e.type === 'audio').length,
      text: visible.filter((e) => e.type === 'text').length,
      favorites: visible.filter((e) => e.favorite).length,
    };
  }

  async addEntry(entry: Omit<GuestbookEntry, 'id'>): Promise<string> {
    const id = 'entry-' + Math.random().toString(36).substring(2, 9);
    const fullEntry: GuestbookEntry = {
      ...entry,
      id,
      created_at: entry.created_at || new Date().toISOString(),
    };
    this.entries.set(id, fullEntry);
    return id;
  }

  async updateStatus(
    id: string,
    status: GuestbookEntry['status'],
    extra: Partial<GuestbookEntry> = {}
  ): Promise<void> {
    const e = this.entries.get(id);
    if (!e) return;
    this.entries.set(id, { ...e, ...extra, status });
  }

  async toggleFavorite(id: string, favorite: boolean): Promise<void> {
    const e = this.entries.get(id);
    if (!e) return;
    this.entries.set(id, { ...e, favorite });
  }

  async toggleHidden(id: string, hidden: boolean): Promise<void> {
    const e = this.entries.get(id);
    if (!e) return;
    this.entries.set(id, { ...e, hidden });
  }

  async deleteEntry(id: string): Promise<void> {
    this.entries.delete(id);
  }

  // Utilitaires de test
  clear(): void {
    this.guestbooks.clear();
    this.entries.clear();
  }
}

