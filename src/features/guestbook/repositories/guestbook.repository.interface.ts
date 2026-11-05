import type {
  Guestbook,
  GuestbookEntry,
  GuestbookSettings,
} from '../domain/types';

export interface ListEntriesOptions {
  limitCount?: number;
  includeHidden?: boolean;
  onlyFavorites?: boolean;
  type?: 'audio' | 'text';
  startAfterCreatedAt?: string;
}

export interface IGuestbookReader {
  getByEventId(eventId: string): Promise<Guestbook | null>;
  getByPublicToken(token: string): Promise<Guestbook | null>;
}

export interface IGuestbookWriter {
  save(guestbook: Guestbook): Promise<void>;
  updateSettings(eventId: string, settings: Partial<GuestbookSettings>): Promise<void>;
  rotateToken(eventId: string): Promise<string>;
}

export interface IGuestbookEntryReader {
  listByGuestbookId(
    guestbookId: string,
    options?: ListEntriesOptions
  ): Promise<GuestbookEntry[]>;
  getById(id: string): Promise<GuestbookEntry | null>;
  countByGuestbookId(guestbookId: string): Promise<{
    total: number;
    audio: number;
    text: number;
    favorites: number;
  }>;
}

export interface IGuestbookEntryWriter {
  addEntry(entry: Omit<GuestbookEntry, 'id'>): Promise<string>;
  updateStatus(
    id: string,
    status: GuestbookEntry['status'],
    extra?: Partial<GuestbookEntry>
  ): Promise<void>;
  toggleFavorite(id: string, favorite: boolean): Promise<void>;
  toggleHidden(id: string, hidden: boolean): Promise<void>;
  deleteEntry(id: string): Promise<void>;
}

export interface IGuestbookRepository
  extends IGuestbookReader,
    IGuestbookWriter,
    IGuestbookEntryReader,
    IGuestbookEntryWriter {}

