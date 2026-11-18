import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeCourses } from '../domain/menu-rules';
import type {
  Course,
  DecisionPage,
  GuestDietarySource,
  MenuDecision,
  WeddingMenu,
} from '../domain/types';
import type {
  GuestDietaryReader,
  MenuDecisionRepository,
  MenuReader,
  MenuWriter,
} from './menu.repository.interface';

const MENUS_COLLECTION = 'menus';
const DECISIONS_SUBCOLLECTION = 'decisions';
const GUESTS_COLLECTION = 'guests';

export class FirestoreMenuRepository
  implements MenuReader, MenuWriter, MenuDecisionRepository, GuestDietaryReader
{
  async getByEventId(eventId: string): Promise<WeddingMenu | null> {
    const ref = doc(db, MENUS_COLLECTION, eventId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      event_id: String(data.event_id ?? eventId),
      owner_id: String(data.owner_id ?? ''),
      courses: normalizeCourses(data.courses as Course[] | undefined),
      dietary_notes: String(data.dietary_notes ?? ''),
      updated_at: String(data.updated_at ?? ''),
    };
  }

  async create(menu: WeddingMenu): Promise<WeddingMenu> {
    const ref = doc(db, MENUS_COLLECTION, menu.event_id);
    await setDoc(ref, menu);
    return menu;
  }

  async updateCourses(
    eventId: string,
    courses: Course[],
    updatedAt: string
  ): Promise<void> {
    const ref = doc(db, MENUS_COLLECTION, eventId);
    await updateDoc(ref, {
      courses,
      updated_at: updatedAt,
    });
  }

  async updateDietaryNotes(
    eventId: string,
    dietaryNotes: string,
    updatedAt: string
  ): Promise<void> {
    const ref = doc(db, MENUS_COLLECTION, eventId);
    await updateDoc(ref, {
      dietary_notes: dietaryNotes,
      updated_at: updatedAt,
    });
  }

  async addDecision(
    eventId: string,
    decision: Omit<MenuDecision, 'id'>
  ): Promise<MenuDecision> {
    const colRef = collection(db, MENUS_COLLECTION, eventId, DECISIONS_SUBCOLLECTION);
    const docRef = await addDoc(colRef, decision);
    return {
      id: docRef.id,
      ...decision,
    };
  }

  async listDecisions(
    eventId: string,
    options?: { limitCount?: number; cursor?: string | null }
  ): Promise<DecisionPage> {
    const limitCount = options?.limitCount ?? 20;
    const colRef = collection(db, MENUS_COLLECTION, eventId, DECISIONS_SUBCOLLECTION);
    const constraints: QueryConstraint[] = [orderBy('at', 'desc')];

    if (options?.cursor) {
      const cursorSnap = await getDoc(
        doc(db, MENUS_COLLECTION, eventId, DECISIONS_SUBCOLLECTION, options.cursor)
      );
      if (cursorSnap.exists()) {
        constraints.push(startAfter(cursorSnap));
      }
    }

    constraints.push(limit(limitCount + 1));

    const snap = await getDocs(query(colRef, ...constraints));
    const hasMore = snap.docs.length > limitCount;
    const docs = hasMore ? snap.docs.slice(0, limitCount) : snap.docs;

    const items: MenuDecision[] = docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        at: String(data.at ?? ''),
        by: String(data.by ?? ''),
        change: String(data.change ?? ''),
      };
    });

    return {
      items,
      nextCursor: hasMore && docs.length > 0 ? docs[docs.length - 1].id : null,
      hasMore,
    };
  }

  async listGuestsForEvent(
    eventId: string,
    fallbackClientId?: string
  ): Promise<GuestDietarySource[]> {
    const colRef = collection(db, GUESTS_COLLECTION);
    let snap = await getDocs(
      query(colRef, where('event_id', '==', eventId), limit(1000))
    );

    if (snap.empty && fallbackClientId) {
      snap = await getDocs(
        query(colRef, where('client_id', '==', fallbackClientId), limit(1000))
      );
    }

    return snap.docs.map((d) => {
      const data = d.data();
      const rawRsvp = String(data.rsvp ?? 'pending');
      const rsvp: GuestDietarySource['rsvp'] =
        rawRsvp === 'confirmed' || rawRsvp === 'declined' ? rawRsvp : 'pending';
      const fullName =
        [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
        String(data.name ?? 'Invité');
      return {
        id: d.id,
        name: fullName,
        rsvp,
        menu: data.menu ? String(data.menu) : 'Standard',
        menu_other: data.menu_other ? String(data.menu_other) : '',
      };
    });
  }
}

