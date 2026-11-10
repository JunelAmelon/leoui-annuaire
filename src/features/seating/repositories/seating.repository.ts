/**
 * Accès données Plan de table — interface + implémentation Firestore (SDK client).
 * Un doc `seating_plans/{event_id}` par mariage — lecture par ID, jamais de requête.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { SeatingPlan, SeatAssignments } from '../domain/types';

const COLLECTION = 'seating_plans';

export interface SeatingRepository {
  getByEventId(eventId: string): Promise<SeatingPlan | null>;
  save(plan: SeatingPlan): Promise<void>;
  /** Écriture partielle des assignations (glisser-déposer) sans réécrire le doc. */
  updateAssignments(eventId: string, assignments: SeatAssignments): Promise<void>;
}

export class FirestoreSeatingRepository implements SeatingRepository {
  async getByEventId(eventId: string): Promise<SeatingPlan | null> {
    const snap = await getDoc(doc(db, COLLECTION, eventId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      event_id: eventId,
      owner_id: d.owner_id || '',
      tables: d.tables || [],
      room_items: d.room_items || [],
      assignments: d.assignments || {},
      background_path: d.background_path || null,
      updated_at: d.updated_at || '',
    };
  }

  async save(plan: SeatingPlan): Promise<void> {
    await setDoc(doc(db, COLLECTION, plan.event_id), plan, { merge: true });
  }

  async updateAssignments(eventId: string, assignments: SeatAssignments): Promise<void> {
    await setDoc(
      doc(db, COLLECTION, eventId),
      { assignments, updated_at: new Date().toISOString() },
      { merge: true }
    );
  }
}

/** Invités confirmés du mariage — lus depuis `guests`, jamais dupliqués. */
export interface SeatingGuest {
  id: string;
  name: string;
  side?: string;
  /** Nom de table saisi dans la page Invités — prioritaire à l'auto-assignation. */
  table?: string;
  has_children?: boolean;
  children_count?: number;
}

export async function fetchConfirmedGuests(eventId: string): Promise<SeatingGuest[]> {
  const q = query(
    collection(db, 'guests'),
    where('event_id', '==', eventId),
    where('rsvp', '==', 'confirmed')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const g = d.data();
    return {
      id: d.id,
      name: `${g.first_name || ''} ${g.last_name || ''}`.trim() || 'Invité',
      side: g.side,
      table: g.table || undefined,
      has_children: g.has_children || false,
      children_count: g.children_count,
    };
  });
}
