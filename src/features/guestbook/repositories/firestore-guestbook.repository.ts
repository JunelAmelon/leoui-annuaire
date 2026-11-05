import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

export class FirestoreGuestbookRepository implements IGuestbookRepository {
  async getByEventId(eventId: string): Promise<Guestbook | null> {
    const docRef = doc(db, GUESTBOOKS_COLLECTION, eventId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Guestbook;
  }

  async getByPublicToken(token: string): Promise<Guestbook | null> {
    // Les requêtes par token public doivent passer par l'API route pour les invités sans compte,
    // mais pour un client connecté, cette méthode reste implémentée.
    const colRef = collection(db, GUESTBOOKS_COLLECTION);
    const q = query(colRef, where('public_token', '==', token), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Guestbook;
  }

  async save(guestbook: Guestbook): Promise<void> {
    const docRef = doc(db, GUESTBOOKS_COLLECTION, guestbook.event_id);
    await setDoc(docRef, guestbook, { merge: true });
  }

  async updateSettings(
    eventId: string,
    settings: Partial<GuestbookSettings>
  ): Promise<void> {
    const docRef = doc(db, GUESTBOOKS_COLLECTION, eventId);
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    for (const [key, val] of Object.entries(settings)) {
      updateData[`settings.${key}`] = val;
    }
    await updateDoc(docRef, updateData);
  }

  async rotateToken(eventId: string): Promise<string> {
    const docRef = doc(db, GUESTBOOKS_COLLECTION, eventId);
    const newToken = crypto.randomUUID();
    await updateDoc(docRef, {
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
    } = options;

    const colRef = collection(db, ENTRIES_COLLECTION);
    const constraints: any[] = [
      where('guestbook_id', '==', guestbookId),
    ];

    if (!includeHidden) {
      constraints.push(where('hidden', '==', false));
    }
    if (onlyFavorites) {
      constraints.push(where('favorite', '==', true));
    }
    if (type) {
      constraints.push(where('type', '==', type));
    }

    constraints.push(orderBy('created_at', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({
      ...(d.data() as Omit<GuestbookEntry, 'id'>),
      id: d.id,
    }));
  }

  async getById(id: string): Promise<GuestbookEntry | null> {
    const docRef = doc(db, ENTRIES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { ...(snap.data() as Omit<GuestbookEntry, 'id'>), id: snap.id };
  }

  async countByGuestbookId(guestbookId: string): Promise<{
    total: number;
    audio: number;
    text: number;
    favorites: number;
  }> {
    const colRef = collection(db, ENTRIES_COLLECTION);
    const baseQuery = query(
      colRef,
      where('guestbook_id', '==', guestbookId),
      where('hidden', '==', false)
    );

    const [totalSnap, audioSnap, textSnap, favSnap] = await Promise.all([
      getCountFromServer(baseQuery),
      getCountFromServer(query(baseQuery, where('type', '==', 'audio'))),
      getCountFromServer(query(baseQuery, where('type', '==', 'text'))),
      getCountFromServer(query(baseQuery, where('favorite', '==', true))),
    ]);

    return {
      total: totalSnap.data().count,
      audio: audioSnap.data().count,
      text: textSnap.data().count,
      favorites: favSnap.data().count,
    };
  }

  async addEntry(entry: Omit<GuestbookEntry, 'id'>): Promise<string> {
    const colRef = collection(db, ENTRIES_COLLECTION);
    const docRef = await addDoc(colRef, {
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
    const docRef = doc(db, ENTRIES_COLLECTION, id);
    await updateDoc(docRef, {
      ...extra,
      status,
      updated_at: new Date().toISOString(),
    });
  }

  async toggleFavorite(id: string, favorite: boolean): Promise<void> {
    const docRef = doc(db, ENTRIES_COLLECTION, id);
    await updateDoc(docRef, {
      favorite,
      updated_at: new Date().toISOString(),
    });
  }

  async toggleHidden(id: string, hidden: boolean): Promise<void> {
    const docRef = doc(db, ENTRIES_COLLECTION, id);
    await updateDoc(docRef, {
      hidden,
      updated_at: new Date().toISOString(),
    });
  }

  async deleteEntry(id: string): Promise<void> {
    const docRef = doc(db, ENTRIES_COLLECTION, id);
    await deleteDoc(docRef);
  }
}

