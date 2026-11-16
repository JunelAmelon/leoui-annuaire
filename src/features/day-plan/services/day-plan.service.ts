/**
 * Service Planning du jour J — cas d'usage du couple.
 * DIP : dépend des interfaces de repository ; l'instanciation concrète se fait dans la page (composition root).
 * Chaque méthode reçoit le planning courant et renvoie le planning à jour après avoir persisté
 * uniquement le chemin modifié (`days.<key>` ou `share`).
 */

import { ConflictError, NotFoundError, ValidationError } from '@/lib/market/errors';
import {
  CATEGORIES, DAY_KEYS, LIMITS,
  type DayKey, type DayPlan, type TimelineItem, type TimelineItemInput, type VendorLink, type VendorRequest,
} from '../domain/types';
import {
  addMinutes, buildStartAt, dayDate, isValidTime, moveTo, rebasePlanDates, shiftFrom, sortItems,
} from '../domain/timeline';
import { templateInputs } from '../domain/template';
import type { DayPlanRepository, VendorRequestRepository } from '../repositories/day-plan.repository.interface';

/** Port appelé quand un moment disparaît : la Playlist et l'album y détachent leurs références. */
export interface MomentLinkCleaner {
  onMomentDeleted(eventId: string, itemId: string): Promise<void>;
}

export interface DayPlanServiceDeps {
  newId?: () => string;
  now?: () => string;
  cleaner?: MomentLinkCleaner;
}

const defaultId = () => globalThis.crypto.randomUUID();

export function validateItemInput(input: TimelineItemInput): TimelineItemInput {
  const fields: Record<string, string> = {};
  const title = input.title.trim();
  if (!title) fields.title = 'Donnez un nom à ce moment.';
  else if (title.length > LIMITS.TITLE) fields.title = `${LIMITS.TITLE} caractères maximum.`;
  if (!isValidTime(input.time)) fields.time = 'Heure attendue au format 14:30.';
  if (!Number.isFinite(input.duration_min) || input.duration_min < 0 || input.duration_min > 24 * 60) fields.duration_min = 'Durée entre 0 et 24 h.';
  if (!(input.category in CATEGORIES)) fields.category = 'Catégorie inconnue.';
  if (!Number.isFinite(input.travel_min) || input.travel_min < 0 || input.travel_min > 600) fields.travel_min = 'Trajet entre 0 et 600 min.';
  if (input.notes.length > LIMITS.NOTES) fields.notes = `${LIMITS.NOTES} caractères maximum.`;
  if (Object.keys(fields).length) throw new ValidationError('Vérifiez les champs du moment.', fields);
  return {
    ...input,
    title,
    duration_min: Math.round(input.duration_min),
    travel_min: Math.round(input.travel_min),
    location_name: input.location_name.trim().slice(0, 120),
    location_address: input.location_address.trim().slice(0, 200),
    people: input.people.map((p) => p.trim()).filter(Boolean).slice(0, LIMITS.PEOPLE),
    notes: input.notes.trim(),
    vendor_ids: [...new Set(input.vendor_ids)],
  };
}

export function findItem(plan: DayPlan, itemId: string): { key: DayKey; item: TimelineItem } | null {
  for (const key of DAY_KEYS) {
    const item = plan.days[key].items.find((i) => i.id === itemId);
    if (item) return { key, item };
  }
  return null;
}

export class DayPlanService {
  private readonly newId: () => string;
  private readonly now: () => string;

  constructor(
    private readonly repo: DayPlanRepository,
    private readonly requests: VendorRequestRepository,
    private readonly deps: DayPlanServiceDeps = {}
  ) {
    this.newId = deps.newId ?? defaultId;
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  /** Ouvre le planning du mariage ; le crée vide au premier passage et suit la date du mariage si elle change. */
  async getOrCreate(eventId: string, ownerId: string, weddingDate: string): Promise<DayPlan> {
    const existing = await this.repo.getByEventId(eventId);
    if (!existing) {
      const at = this.now();
      const days = {} as DayPlan['days'];
      for (const key of DAY_KEYS) days[key] = { date: dayDate(weddingDate, key), items: [] };
      const plan: DayPlan = {
        event_id: eventId, owner_id: ownerId, days,
        share: { token: null, token_revoked_at: null, vendor_links: [] },
        created_at: at, updated_at: at,
      };
      await this.repo.create(plan);
      return plan;
    }
    if (existing.days.day.date === weddingDate) return existing;
    const rebased = existing.days.day.date
      ? rebasePlanDates(existing, weddingDate)
      : { ...existing, days: Object.fromEntries(DAY_KEYS.map((k) => [k, { ...existing.days[k], date: dayDate(weddingDate, k) }])) as DayPlan['days'] };
    await this.repo.saveDays(eventId, rebased.days);
    return rebased;
  }

  private buildItem(blockDate: string, input: TimelineItemInput, id: string, sortKey: number): TimelineItem {
    const start_at = buildStartAt(blockDate, input.time);
    return {
      id,
      title: input.title,
      start_at,
      end_at: addMinutes(start_at, input.duration_min),
      duration_min: input.duration_min,
      category: input.category,
      location: { name: input.location_name, address: input.location_address, travel_min: input.travel_min },
      people: input.people,
      notes: input.notes,
      vendor_ids: input.vendor_ids,
      sort_key: sortKey,
    };
  }

  private async persistDay(plan: DayPlan, key: DayKey, items: TimelineItem[]): Promise<DayPlan> {
    const block = { date: plan.days[key].date, items: sortItems(items) };
    await this.repo.saveDay(plan.event_id, key, block);
    return { ...plan, days: { ...plan.days, [key]: block } };
  }

  async addItem(plan: DayPlan, key: DayKey, raw: TimelineItemInput): Promise<DayPlan> {
    const input = validateItemInput(raw);
    const items = plan.days[key].items;
    if (items.length >= LIMITS.ITEMS_PER_DAY) throw new ConflictError(`${LIMITS.ITEMS_PER_DAY} moments maximum par journée.`);
    const sortKey = items.reduce((max, i) => Math.max(max, i.sort_key), 0) + 1;
    return this.persistDay(plan, key, [...items, this.buildItem(plan.days[key].date, input, this.newId(), sortKey)]);
  }

  /** Modifie un moment en conservant son `id` (références Playlist/album) ; `targetKey` le change de journée. */
  async updateItem(plan: DayPlan, key: DayKey, itemId: string, raw: TimelineItemInput, targetKey: DayKey = key): Promise<DayPlan> {
    const input = validateItemInput(raw);
    const current = plan.days[key].items.find((i) => i.id === itemId);
    if (!current) throw new NotFoundError('Ce moment n’existe plus.');
    const updated = this.buildItem(plan.days[targetKey].date, input, current.id, current.sort_key);
    if (targetKey === key) {
      return this.persistDay(plan, key, plan.days[key].items.map((i) => (i.id === itemId ? updated : i)));
    }
    if (plan.days[targetKey].items.length >= LIMITS.ITEMS_PER_DAY) throw new ConflictError(`${LIMITS.ITEMS_PER_DAY} moments maximum par journée.`);
    const without = await this.persistDay(plan, key, plan.days[key].items.filter((i) => i.id !== itemId));
    return this.persistDay(without, targetKey, [...without.days[targetKey].items, updated]);
  }

  async removeItem(plan: DayPlan, key: DayKey, itemId: string): Promise<DayPlan> {
    const next = await this.persistDay(plan, key, plan.days[key].items.filter((i) => i.id !== itemId));
    await this.deps.cleaner?.onMomentDeleted(plan.event_id, itemId);
    return next;
  }

  /** Décale un moment (et la suite si `cascade`) — utilisé pour résoudre une alerte de trajet. */
  async shift(plan: DayPlan, key: DayKey, itemId: string, minutes: number, cascade: boolean): Promise<DayPlan> {
    if (!plan.days[key].items.some((i) => i.id === itemId)) throw new NotFoundError('Ce moment n’existe plus.');
    return this.persistDay(plan, key, shiftFrom(plan.days[key].items, itemId, minutes, cascade));
  }

  /** Remplit les journées encore vides avec le déroulé type. Ne touche jamais une journée déjà saisie. */
  async applyTemplate(plan: DayPlan): Promise<DayPlan> {
    let next = plan;
    for (const key of DAY_KEYS) {
      if (next.days[key].items.length) continue;
      const items = templateInputs(key).map((input, i) => this.buildItem(next.days[key].date, input, this.newId(), i + 1));
      next = await this.persistDay(next, key, items);
    }
    return next;
  }

  // ── Partage ────────────────────────────────────────────────────────────────

  private async persistShare(plan: DayPlan, share: DayPlan['share']): Promise<DayPlan> {
    await this.repo.saveShare(plan.event_id, share);
    return { ...plan, share };
  }

  /** Active (ou régénère) le lien général en lecture seule. L'ancien lien cesse de fonctionner. */
  enableShare(plan: DayPlan): Promise<DayPlan> {
    return this.persistShare(plan, { ...plan.share, token: this.newId(), token_revoked_at: null });
  }

  revokeShare(plan: DayPlan): Promise<DayPlan> {
    return this.persistShare(plan, { ...plan.share, token_revoked_at: this.now() });
  }

  async addVendorLink(plan: DayPlan, rawLabel: string): Promise<DayPlan> {
    const label = rawLabel.trim().slice(0, 80);
    if (!label) throw new ValidationError('Indiquez le nom de l’intervenant.', { label: 'Nom requis.' });
    if (plan.share.vendor_links.length >= LIMITS.VENDOR_LINKS) throw new ConflictError(`${LIMITS.VENDOR_LINKS} intervenants maximum.`);
    if (plan.share.vendor_links.some((l) => l.label.toLowerCase() === label.toLowerCase())) throw new ConflictError('Cet intervenant existe déjà.');
    const link: VendorLink = { vendor_id: `v_${this.newId().slice(0, 8)}`, label, token: this.newId(), token_revoked_at: null };
    return this.persistShare(plan, { ...plan.share, vendor_links: [...plan.share.vendor_links, link] });
  }

  /** Coupe l'accès d'un intervenant ; `active = true` lui génère un nouveau lien. */
  setVendorAccess(plan: DayPlan, vendorId: string, active: boolean): Promise<DayPlan> {
    const vendor_links = plan.share.vendor_links.map((l) =>
      l.vendor_id !== vendorId ? l : active ? { ...l, token: this.newId(), token_revoked_at: null } : { ...l, token_revoked_at: this.now() }
    );
    return this.persistShare(plan, { ...plan.share, vendor_links });
  }

  // ── Propositions des prestataires ──────────────────────────────────────────

  listRequests(eventId: string): Promise<VendorRequest[]> {
    return this.requests.list(eventId, { limit: 50 });
  }

  /**
   * Tranche une proposition. Acceptée : le moment prend l'heure proposée (et entraîne la suite si `cascade`).
   * Si le moment a disparu entre-temps, la proposition est simplement refusée.
   */
  async decideRequest(plan: DayPlan, request: VendorRequest, accept: boolean, cascade = false): Promise<DayPlan> {
    if (request.status !== 'pending') throw new ConflictError('Cette proposition a déjà été traitée.');
    const found = accept ? findItem(plan, request.item_id) : null;
    let next = plan;
    if (accept && found) next = await this.persistDay(plan, found.key, moveTo(plan.days[found.key].items, request.item_id, request.proposed_start_at, cascade));
    await this.requests.decide(plan.event_id, request.id, accept && found ? 'accepted' : 'declined', this.now());
    return next;
  }
}
