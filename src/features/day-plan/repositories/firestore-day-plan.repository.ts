/**
 * Implémentation Firestore (SDK client) — utilisée par le couple connecté.
 * Les propositions des prestataires sont créées par l'API (Admin SDK) : ici, lecture et décision seulement.
 */

import { db } from '@/lib/firebase';
import {
  collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import type { DayBlock, DayKey, DayPlan, DayPlanShare, VendorRequest, VendorRequestStatus } from '../domain/types';
import {
  DAY_PLANS_COLLECTION, VENDOR_REQUESTS_SUBCOLLECTION, mapDayPlan, mapVendorRequest,
  type DayPlanRepository, type VendorRequestRepository,
} from './day-plan.repository.interface';

const now = () => new Date().toISOString();

export class FirestoreDayPlanRepository implements DayPlanRepository {
  async getByEventId(eventId: string): Promise<DayPlan | null> {
    const snap = await getDoc(doc(db, DAY_PLANS_COLLECTION, eventId));
    return snap.exists() ? mapDayPlan(eventId, snap.data()) : null;
  }

  async create(plan: DayPlan): Promise<void> {
    const at = now();
    await setDoc(doc(db, DAY_PLANS_COLLECTION, plan.event_id), { ...plan, created_at: at, updated_at: at });
  }

  async saveDay(eventId: string, key: DayKey, block: DayBlock): Promise<void> {
    await updateDoc(doc(db, DAY_PLANS_COLLECTION, eventId), { [`days.${key}`]: block, updated_at: now() });
  }

  async saveDays(eventId: string, days: DayPlan['days']): Promise<void> {
    await updateDoc(doc(db, DAY_PLANS_COLLECTION, eventId), { days, updated_at: now() });
  }

  async saveShare(eventId: string, share: DayPlanShare): Promise<void> {
    await updateDoc(doc(db, DAY_PLANS_COLLECTION, eventId), { share, updated_at: now() });
  }
}

export class FirestoreVendorRequestRepository implements VendorRequestRepository {
  private col(eventId: string) {
    return collection(db, DAY_PLANS_COLLECTION, eventId, VENDOR_REQUESTS_SUBCOLLECTION);
  }

  async list(eventId: string, options: { vendorId?: string; limit?: number } = {}): Promise<VendorRequest[]> {
    const max = Math.min(options.limit ?? 50, 100);
    const q = options.vendorId
      ? query(this.col(eventId), where('vendor_id', '==', options.vendorId), limit(max))
      : query(this.col(eventId), orderBy('created_at', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapVendorRequest(d.id, d.data())).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  async get(eventId: string, id: string): Promise<VendorRequest | null> {
    const snap = await getDoc(doc(this.col(eventId), id));
    return snap.exists() ? mapVendorRequest(snap.id, snap.data()) : null;
  }

  async countPending(eventId: string, vendorId: string): Promise<number> {
    const snap = await getCountFromServer(query(this.col(eventId), where('vendor_id', '==', vendorId), where('status', '==', 'pending')));
    return snap.data().count;
  }

  async create(): Promise<VendorRequest> {
    throw new Error('Les propositions des prestataires sont créées par l’API.');
  }

  async decide(eventId: string, id: string, status: Exclude<VendorRequestStatus, 'pending'>, decidedAt: string): Promise<void> {
    await updateDoc(doc(this.col(eventId), id), { status, decided_at: decidedAt });
  }
}
