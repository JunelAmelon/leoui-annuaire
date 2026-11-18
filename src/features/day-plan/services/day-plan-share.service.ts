/**
 * Service du lien partagé (sans compte) : résolution du jeton, vue publique épurée,
 * proposition de décalage par un prestataire. Utilisé uniquement côté serveur (API route).
 */

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/market/errors';
import {
  DAY_KEYS, LIMITS,
  type DayKey, type DayPlan, type TimelineItem, type VendorRequest,
} from '../domain/types';
import { buildStartAt, isValidTime, sortItems } from '../domain/timeline';
import type { DayPlanReader, VendorRequestRepository } from '../repositories/day-plan.repository.interface';
import { findItem } from './day-plan.service';

export type ShareViewer = { kind: 'guest' } | { kind: 'vendor'; vendor_id: string; label: string };

export interface PublicDayPlanView {
  viewer: ShareViewer;
  days: Record<DayKey, { date: string; items: TimelineItem[] }>;
  /** Intervenants sans leurs jetons. */
  vendors: { vendor_id: string; label: string }[];
  /** Propositions du prestataire connecté par son lien (vide pour le lien général). */
  requests: VendorRequest[];
}

export interface ProposeShiftInput {
  item_id: string;
  time: string;
  reason: string;
}

const NOT_FOUND = 'Ce lien n’est plus valide. Demandez un nouveau lien aux mariés.';

export class DayPlanShareService {
  constructor(
    private readonly reader: DayPlanReader,
    private readonly requests: VendorRequestRepository,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  /** Jeton général ou jeton d'intervenant, non révoqué. Même message d'erreur dans tous les cas d'échec. */
  async resolve(eventId: string, token: string): Promise<{ plan: DayPlan; viewer: ShareViewer }> {
    if (!eventId || !token || token.length < 16) throw new NotFoundError(NOT_FOUND);
    const plan = await this.reader.getByEventId(eventId);
    if (!plan) throw new NotFoundError(NOT_FOUND);
    if (plan.share.token === token && !plan.share.token_revoked_at) return { plan, viewer: { kind: 'guest' } };
    const link = plan.share.vendor_links.find((l) => l.token === token && !l.token_revoked_at);
    if (!link) throw new NotFoundError(NOT_FOUND);
    return { plan, viewer: { kind: 'vendor', vendor_id: link.vendor_id, label: link.label } };
  }

  async getPublicView(eventId: string, token: string): Promise<PublicDayPlanView> {
    const { plan, viewer } = await this.resolve(eventId, token);
    const days = {} as PublicDayPlanView['days'];
    for (const key of DAY_KEYS) {
      days[key] = {
        date: plan.days[key].date,
        // Les notes internes ne sortent que pour les prestataires ; le lien général reste un simple programme.
        items: sortItems(plan.days[key].items).map((i) => (viewer.kind === 'vendor' ? i : { ...i, notes: '' })),
      };
    }
    return {
      viewer,
      days,
      vendors: plan.share.vendor_links.filter((l) => !l.token_revoked_at).map(({ vendor_id, label }) => ({ vendor_id, label })),
      requests: viewer.kind === 'vendor' ? await this.requests.list(eventId, { vendorId: viewer.vendor_id, limit: 20 }) : [],
    };
  }

  /** Un prestataire propose une autre heure pour un moment où il intervient. Rien ne change tant que le couple n'a pas accepté. */
  async proposeShift(eventId: string, token: string, input: ProposeShiftInput): Promise<VendorRequest> {
    const { plan, viewer } = await this.resolve(eventId, token);
    if (viewer.kind !== 'vendor') throw new ForbiddenError('Seuls les prestataires peuvent proposer un autre horaire.');

    const found = findItem(plan, String(input.item_id || ''));
    if (!found) throw new NotFoundError('Ce moment n’existe plus dans le planning.');
    if (!found.item.vendor_ids.includes(viewer.vendor_id)) throw new ForbiddenError('Vous n’intervenez pas sur ce moment.');
    if (!isValidTime(String(input.time || ''))) throw new ValidationError('Heure attendue au format 14:30.', { time: 'Heure invalide.' });

    const reason = String(input.reason || '').trim();
    if (reason.length > LIMITS.REASON) throw new ValidationError(`Motif : ${LIMITS.REASON} caractères maximum.`, { reason: 'Trop long.' });

    const proposed_start_at = buildStartAt(plan.days[found.key].date, input.time);
    if (proposed_start_at === found.item.start_at) throw new ValidationError('C’est déjà l’heure prévue.', { time: 'Heure identique.' });

    const pending = await this.requests.countPending(eventId, viewer.vendor_id);
    if (pending >= LIMITS.PENDING_REQUESTS_PER_VENDOR) throw new ConflictError('Vous avez déjà plusieurs propositions en attente de réponse.');

    return this.requests.create({
      event_id: eventId,
      owner_id: plan.owner_id,
      vendor_id: viewer.vendor_id,
      vendor_label: viewer.label,
      item_id: found.item.id,
      proposed_start_at,
      reason,
      status: 'pending',
      created_at: this.now(),
      decided_at: null,
    });
  }
}
