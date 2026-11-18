/**
 * Contrats d'accès aux données du Planning du jour J.
 * Interfaces petites (ISP) : le lien partagé n'a besoin que du lecteur.
 * `updated_at` est posé par les implémentations, jamais par l'UI ni le service.
 */

import type { DayBlock, DayKey, DayPlan, DayPlanShare, VendorRequest, VendorRequestStatus } from '../domain/types';
import { DAY_KEYS } from '../domain/types';

export interface DayPlanReader {
  /** Lecture par ID (`day_plans/{event_id}`), jamais de requête. */
  getByEventId(eventId: string): Promise<DayPlan | null>;
}

export interface DayPlanWriter {
  create(plan: DayPlan): Promise<void>;
  /** Écriture par chemin `days.<key>` : ne réécrit pas le document entier. */
  saveDay(eventId: string, key: DayKey, block: DayBlock): Promise<void>;
  saveDays(eventId: string, days: DayPlan['days']): Promise<void>;
  saveShare(eventId: string, share: DayPlanShare): Promise<void>;
}

export type DayPlanRepository = DayPlanReader & DayPlanWriter;

export interface VendorRequestRepository {
  /** Liste bornée, plus récentes d'abord. `vendorId` restreint à un intervenant. */
  list(eventId: string, options?: { vendorId?: string; limit?: number }): Promise<VendorRequest[]>;
  get(eventId: string, id: string): Promise<VendorRequest | null>;
  countPending(eventId: string, vendorId: string): Promise<number>;
  create(request: Omit<VendorRequest, 'id'>): Promise<VendorRequest>;
  decide(eventId: string, id: string, status: Exclude<VendorRequestStatus, 'pending'>, decidedAt: string): Promise<void>;
}

/** Normalise un document brut en `DayPlan` complet (champs absents → valeurs sûres). */
export function mapDayPlan(eventId: string, d: Record<string, any>): DayPlan {
  const days = {} as DayPlan['days'];
  for (const key of DAY_KEYS) {
    const block = d.days?.[key] ?? {};
    days[key] = { date: block.date || '', items: Array.isArray(block.items) ? block.items : [] };
  }
  return {
    event_id: eventId,
    owner_id: d.owner_id || '',
    days,
    share: {
      token: d.share?.token ?? null,
      token_revoked_at: d.share?.token_revoked_at ?? null,
      vendor_links: Array.isArray(d.share?.vendor_links) ? d.share.vendor_links : [],
    },
    created_at: d.created_at || '',
    updated_at: d.updated_at || '',
  };
}

export function mapVendorRequest(id: string, d: Record<string, any>): VendorRequest {
  return {
    id,
    event_id: d.event_id || '',
    owner_id: d.owner_id || '',
    vendor_id: d.vendor_id || '',
    vendor_label: d.vendor_label || '',
    item_id: d.item_id || '',
    proposed_start_at: d.proposed_start_at || '',
    reason: d.reason || '',
    status: d.status === 'accepted' || d.status === 'declined' ? d.status : 'pending',
    created_at: d.created_at || '',
    decided_at: d.decided_at ?? null,
  };
}

export const DAY_PLANS_COLLECTION = 'day_plans';
export const VENDOR_REQUESTS_SUBCOLLECTION = 'vendor_requests';
