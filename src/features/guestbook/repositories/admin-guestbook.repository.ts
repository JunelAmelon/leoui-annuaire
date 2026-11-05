import { adminDb } from '@/lib/firebase-admin';
import type {
  Guestbook,
  GuestbookEntry,
  GuestbookSettings,
} from '../domain/types';
import type {
  IGuestbookRepository,
  ListEntriesOptions,
} from './guestbook.repository.interface';

const GUESTBOOKS_COLLECTION = 'guestbooks';
const ENTRIES_COLLECTION = 'guestbook_entries';

export class AdminGuestbookRepository implements IGuestbookRepository {
  async getByEventId(eventId: string): Promise<Guestbook | null> {
    const docSnap = await adminDb.collection(GUESTBOOKS_COLLECTION).doc(eventId).get();
    if (!docSnap.exists) return null;
    return docSnap.data() as Guestbook;
  }

  async getByPublicToken(token: string): Promise<Guestbook | null> {
    const snap = await adminDb
      .collection(GUESTBOOKS_COLLECTION)
      .where('public_token', '==', token)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as Guestbook;

    // Vérifier si le token n'a pas été révoqué
    if (data.token_revoked_at) return null;

    // Vérifier si le token n'a pas expiré
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
      return null;
    }

    return data;
  }

  async save(guestbook: Guestbook): Promise<void> {
    await adminDb
      .collection(GUESTBOOKS_COLLECTION)
      .doc(guestbook.event_id)
      .set(guestbook, { merge: true });
  }

  async updateSettings(
    eventId: string,
    settings: Partial<GuestbookSettings>
  ): Promise<void> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    for (const [key, val] of Object.entries(settings)) {
      updateData[`settings.${key}`] = val;
    }
    await adminDb.collection(GUESTBOOKS_COLLECTION).doc(eventId).update(updateData);
  }

  async rotateToken(eventId: string): Promise<string> {
    const newToken = crypto.randomUUID();
    await adminDb.collection(GUESTBOOKS_COLLECTION).doc(eventId).update({
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
    const {
      limitCount = 50,
      includeHidden = false,
      onlyFavorites = false,
      type,
      startAfterCreatedAt,
    } = options;

    let q: FirebaseFirestore.Query = adminDb
      .collection(ENTRIES_COLLECTION)
      .where('guestbook_id', '==', guestbookId);

    if (!includeHidden) {
      q = q.where('hidden', '==', false);
    }

    if (onlyFavorites) {
      q = q.where('favorite', '==', true);
    }

    if (type) {
      q = q.where('type', '==', type);
    }

    q = q.orderBy('created_at', 'desc');

    if (startAfterCreatedAt) {
      q = q.startAfter(startAfterCreatedAt);
    }

    q = q.limit(limitCount);

    const snap = await q.get();
    return snap.docs.map((d) => ({
      ...(d.data() as Omit<GuestbookEntry, 'id'>),
      id: d.id,
    }));
  }

  async getById(id: string): Promise<GuestbookEntry | null> {
    const doc = await adminDb.collection(ENTRIES_COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { ...(doc.data() as Omit<GuestbookEntry, 'id'>), id: doc.id };
  }

  async countByGuestbookId(guestbookId: string): Promise<{
    total: number;
    audio: number;
    text: number;
    favorites: number;
  }> {
    const baseRef = adminDb
      .collection(ENTRIES_COLLECTION)
      .where('guestbook_id', '==', guestbookId)
      .where('hidden', '==', false);

    const [totalSnap, audioSnap, textSnap, favSnap] = await Promise.all([
      baseRef.count().get(),
      baseRef.where('type', '==', 'audio').count().get(),
      baseRef.where('type', '==', 'text').count().get(),
      baseRef.where('favorite', '==', true).count().get(),
    ]);

    return {
      total: totalSnap.data().count,
      audio: audioSnap.data().count,
      text: textSnap.data().count,
      favorites: favSnap.data().count,
    };
  }

  async addEntry(entry: Omit<GuestbookEntry, 'id'>): Promise<string> {
    const colRef = adminDb.collection(ENTRIES_COLLECTION);
    const docRef = await colRef.add({
      ...entry,
      created_at: new Date().toISOString(),
    });
    return docRef.id;
  }

  async updateStatus(
    id: string,
    status: GuestbookEntry['status'],
    extra: Partial<GuestbookEntry> = {}
  ): Promise<void> {
    await adminDb.collection(ENTRIES_COLLECTION).doc(id).update({
      ...extra,
      status,
      updated_at: new Date().toISOString(),
    });
  }

  async toggleFavorite(id: string, favorite: boolean): Promise<void> {
    await adminDb.collection(ENTRIES_COLLECTION).doc(id).update({
      favorite,
      updated_at: new Date().toISOString(),
    });
  }

  async toggleHidden(id: string, hidden: boolean): Promise<void> {
    await adminDb.collection(ENTRIES_COLLECTION).doc(id).update({
      hidden,
      updated_at: new Date().toISOString(),
    });
  }

  async deleteEntry(id: string): Promise<void> {
    await adminDb.collection(ENTRIES_COLLECTION).doc(id).delete();
  }
}

