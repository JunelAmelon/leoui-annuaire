import { adminDb } from '@/lib/firebase-admin';
import type { Gazette } from '../domain/types';
import type { IGazetteRepository } from './gazette.repository.interface';

const GAZETTES_COLLECTION = 'gazettes';

export class AdminGazetteRepository implements IGazetteRepository {
  async getByEventId(eventId: string): Promise<Gazette | null> {
    if (!eventId) return null;
    const snap = await adminDb.collection(GAZETTES_COLLECTION).doc(eventId).get();
    if (!snap.exists) return null;
    return snap.data() as Gazette;
  }

  async save(gazette: Gazette): Promise<Gazette> {
    const dataToSave: Gazette = {
      ...gazette,
      updated_at: new Date().toISOString(),
    };
    await adminDb.collection(GAZETTES_COLLECTION).doc(gazette.event_id).set(dataToSave, { merge: true });
    return dataToSave;
  }

  async update(
    eventId: string,
    partial: Partial<Gazette>,
    expectedVersion?: number
  ): Promise<Gazette> {
    const docRef = adminDb.collection(GAZETTES_COLLECTION).doc(eventId);

    const updated = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) {
        throw new Error(`Gazette introuvable pour l'événement ${eventId}`);
      }

      const current = snap.data() as Gazette;

      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        throw new Error(
          `Conflit d'édition : version attendue ${expectedVersion}, version actuelle ${current.version}.`
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

    return updated;
  }

  async delete(eventId: string): Promise<void> {
    await adminDb.collection(GAZETTES_COLLECTION).doc(eventId).delete();
  }
}

