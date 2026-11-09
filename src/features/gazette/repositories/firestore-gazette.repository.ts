import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Gazette } from '../domain/types';
import type { IGazetteRepository } from './gazette.repository.interface';

const GAZETTES_COLLECTION = 'gazettes';

export class FirestoreGazetteRepository implements IGazetteRepository {
  async getByEventId(eventId: string): Promise<Gazette | null> {
    if (!eventId) return null;
    const docRef = doc(db, GAZETTES_COLLECTION, eventId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as Gazette;
  }

  async save(gazette: Gazette): Promise<Gazette> {
    const docRef = doc(db, GAZETTES_COLLECTION, gazette.event_id);
    const dataToSave: Gazette = {
      ...gazette,
      updated_at: new Date().toISOString(),
    };
    await setDoc(docRef, dataToSave, { merge: true });
    return dataToSave;
  }

  async update(
    eventId: string,
    partial: Partial<Gazette>,
    expectedVersion?: number
  ): Promise<Gazette> {
    const docRef = doc(db, GAZETTES_COLLECTION, eventId);

    const updatedGazette = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) {
        throw new Error(`Gazette introuvable pour l'événement ${eventId}`);
      }

      const current = snap.data() as Gazette;

      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        throw new Error(
          `Conflit de version : le document a été modifié entre-temps (version actuelle : ${current.version}, version attendue : ${expectedVersion}).`
        );
      }

      const nextVersion = (current.version || 1) + 1;
      const merged: Gazette = {
        ...current,
        ...partial,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      };

      transaction.set(docRef, merged, { merge: true });
      return merged;
    });

    return updatedGazette;
  }

  async delete(eventId: string): Promise<void> {
    const docRef = doc(db, GAZETTES_COLLECTION, eventId);
    await deleteDoc(docRef);
  }
}
