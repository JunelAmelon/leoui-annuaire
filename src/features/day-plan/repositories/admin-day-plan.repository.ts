/**
 * Implémentation Admin SDK — réservée aux API routes (liens partagés sans compte).
 * Server-only.
 */

import { adminDb } from '@/lib/firebase-admin';
import type { DayPlan, VendorRequest, VendorRequestStatus } from '../domain/types';
import {
  DAY_PLANS_COLLECTION, VENDOR_REQUESTS_SUBCOLLECTION, mapDayPlan, mapVendorRequest,
  type DayPlanReader, type VendorRequestRepository,
} from './day-plan.repository.interface';

export class AdminDayPlanReader implements DayPlanReader {
  async getByEventId(eventId: string): Promise<DayPlan | null> {
    const snap = await adminDb.collection(DAY_PLANS_COLLECTION).doc(eventId).get();
    return snap.exists ? mapDayPlan(eventId, snap.data() ?? {}) : null;
  }
}

export class AdminVendorRequestRepository implements VendorRequestRepository {
  private col(eventId: string) {
    return adminDb.collection(DAY_PLANS_COLLECTION).doc(eventId).collection(VENDOR_REQUESTS_SUBCOLLECTION);
  }

  async list(eventId: string, options: { vendorId?: string; limit?: number } = {}): Promise<VendorRequest[]> {
    const max = Math.min(options.limit ?? 50, 100);
    const q = options.vendorId
      ? this.col(eventId).where('vendor_id', '==', options.vendorId).limit(max)
      : this.col(eventId).orderBy('created_at', 'desc').limit(max);
    const snap = await q.get();
    return snap.docs.map((d) => mapVendorRequest(d.id, d.data())).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  async get(eventId: string, id: string): Promise<VendorRequest | null> {
    const snap = await this.col(eventId).doc(id).get();
    return snap.exists ? mapVendorRequest(snap.id, snap.data() ?? {}) : null;
  }

  async countPending(eventId: string, vendorId: string): Promise<number> {
    const snap = await this.col(eventId).where('vendor_id', '==', vendorId).where('status', '==', 'pending').count().get();
    return snap.data().count;
  }

  async create(request: Omit<VendorRequest, 'id'>): Promise<VendorRequest> {
    const ref = await this.col(request.event_id).add(request);
    return { ...request, id: ref.id };
  }

  async decide(eventId: string, id: string, status: Exclude<VendorRequestStatus, 'pending'>, decidedAt: string): Promise<void> {
    await this.col(eventId).doc(id).update({ status, decided_at: decidedAt });
  }
}

/** Noms du couple pour l'en-tête du lien partagé (1 lecture par ID). */
export async function readCoupleNames(eventId: string): Promise<string> {
  const snap = await adminDb.collection('events').doc(eventId).get();
  return (snap.data()?.couple_names as string | undefined) || '';
}
