/** Implémentations en mémoire — tests unitaires des services (même contrat que Firestore). */

import type { DayBlock, DayKey, DayPlan, DayPlanShare, VendorRequest, VendorRequestStatus } from '../domain/types';
import type { DayPlanRepository, VendorRequestRepository } from './day-plan.repository.interface';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export class InMemoryDayPlanRepository implements DayPlanRepository {
  readonly plans = new Map<string, DayPlan>();
  writes = 0;

  async getByEventId(eventId: string): Promise<DayPlan | null> {
    const plan = this.plans.get(eventId);
    return plan ? clone(plan) : null;
  }

  async create(plan: DayPlan): Promise<void> {
    this.plans.set(plan.event_id, clone(plan));
    this.writes++;
  }

  private patch(eventId: string, change: (plan: DayPlan) => void): void {
    const plan = this.plans.get(eventId);
    if (!plan) throw new Error('Planning introuvable');
    change(plan);
    plan.updated_at = new Date().toISOString();
    this.writes++;
  }

  async saveDay(eventId: string, key: DayKey, block: DayBlock): Promise<void> {
    this.patch(eventId, (plan) => { plan.days[key] = clone(block); });
  }

  async saveDays(eventId: string, days: DayPlan['days']): Promise<void> {
    this.patch(eventId, (plan) => { plan.days = clone(days); });
  }

  async saveShare(eventId: string, share: DayPlanShare): Promise<void> {
    this.patch(eventId, (plan) => { plan.share = clone(share); });
  }
}

export class InMemoryVendorRequestRepository implements VendorRequestRepository {
  readonly requests: VendorRequest[] = [];
  private seq = 0;

  async list(eventId: string, options: { vendorId?: string; limit?: number } = {}): Promise<VendorRequest[]> {
    return this.requests
      .filter((r) => r.event_id === eventId && (!options.vendorId || r.vendor_id === options.vendorId))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, options.limit ?? 50)
      .map(clone);
  }

  async get(eventId: string, id: string): Promise<VendorRequest | null> {
    const found = this.requests.find((r) => r.event_id === eventId && r.id === id);
    return found ? clone(found) : null;
  }

  async countPending(eventId: string, vendorId: string): Promise<number> {
    return this.requests.filter((r) => r.event_id === eventId && r.vendor_id === vendorId && r.status === 'pending').length;
  }

  async create(request: Omit<VendorRequest, 'id'>): Promise<VendorRequest> {
    const created = { ...clone(request), id: `req_${++this.seq}` };
    this.requests.push(created);
    return clone(created);
  }

  async decide(eventId: string, id: string, status: Exclude<VendorRequestStatus, 'pending'>, decidedAt: string): Promise<void> {
    const found = this.requests.find((r) => r.event_id === eventId && r.id === id);
    if (!found) throw new Error('Proposition introuvable');
    found.status = status;
    found.decided_at = decidedAt;
  }
}
