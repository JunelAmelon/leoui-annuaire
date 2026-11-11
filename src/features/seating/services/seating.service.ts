/**
 * Service Plan de table — cas d'usage métier.
 * DIP : dépend de l'interface SeatingRepository, jamais de Firestore directement.
 */

import type { SeatingPlan, SeatingTable, RoomItem, RoomItemType, SeatAssignments, SeatType, RoomConfig, DecorConfig } from '../domain/types';
import type { SeatingRepository, SeatingGuest } from '../repositories/seating.repository';
import { seatKey, DEFAULT_DECOR } from '../domain/types';
import {
  normalizeRoom, roomPolygon, roomSizeUnits, nudgeInside, innerAnchor, gridSlots, tableSizeUnits,
  type Point,
} from '../domain/room-geometry';

/** Dimensions par défaut des éléments de salle (unités canvas 1000×700). */
export const ROOM_ITEM_DEFS: Record<RoomItemType, { label: string; w: number; h: number }> = {
  stage:      { label: "Table d'honneur", w: 260, h: 40 },
  dj:         { label: 'DJ / Orchestre',  w: 120, h: 40 },
  dancefloor: { label: 'Piste de danse',  w: 220, h: 140 },
  bar:        { label: 'Bar',             w: 140, h: 45 },
  buffet:     { label: 'Buffet',          w: 200, h: 45 },
  entrance:   { label: 'Entrée',          w: 90,  h: 20 },
  photobooth: { label: 'Photobooth',      w: 80,  h: 80 },
};

/** Position de référence (salle 1000×700) d'un élément selon son rôle. */
function roomItemRefPos(type: RoomItemType, n: number): { x: number; y: number } {
  switch (type) {
    case 'stage':      return { x: 370, y: 30 };
    case 'dj':         return { x: 60 + n * 150, y: 30 };
    case 'dancefloor': return { x: 390, y: 120 };
    case 'buffet':     return { x: 40,  y: 580 - n * 60 };
    case 'bar':        return { x: 830, y: 580 - n * 60 };
    case 'entrance':   return { x: 455, y: 670 };
    case 'photobooth': return { x: 880, y: 120 };
  }
}

/** Construit un élément de salle positionné proportionnellement à la salle, ramené dans son contour. */
function buildRoomItem(type: RoomItemType, existing: RoomItem[], room: RoomConfig, id: string): RoomItem {
  const def = ROOM_ITEM_DEFS[type];
  const size = roomSizeUnits(room);
  const ref = roomItemRefPos(type, existing.filter((i) => i.type === type).length);
  const c = nudgeInside(
    { x: ref.x * (size.w / 1000) + def.w / 2, y: ref.y * (size.h / 700) + def.h / 2 },
    roomPolygon(room),
    6
  );
  return { id, type, x: c.x - def.w / 2, y: c.y - def.h / 2, w: def.w, h: def.h, rotation: 0, label: def.label };
}

const centerOfTable = (t: SeatingTable): Point => {
  const s = tableSizeUnits(t.shape);
  return { x: t.x + s.w / 2, y: t.y + s.h / 2 };
};

export function createSeatingService(repo: SeatingRepository) {
  const uid = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : `t${Date.now()}`;

  return {
    /** Récupère le plan ou en crée un vide pour le mariage. */
    async getOrCreate(eventId: string, ownerId: string): Promise<SeatingPlan> {
      const existing = await repo.getByEventId(eventId);
      if (existing) return existing;
      const plan: SeatingPlan = {
        event_id: eventId,
        owner_id: ownerId,
        tables: [],
        room_items: [],
        assignments: {},
        background_path: null,
        updated_at: new Date().toISOString(),
      };
      await repo.save(plan);
      return plan;
    },

    async addTable(plan: SeatingPlan, shape: SeatingTable['shape'], seats: number): Promise<SeatingTable[]> {
      const n = plan.tables.length + 1;
      // Emplacement libre le plus proche du centre de la salle (évite l'empilement)
      const room = normalizeRoom(plan.room);
      const sz = tableSizeUnits(shape);
      const taken = plan.tables.map(centerOfTable);
      const items = plan.room_items.map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h }));
      const anchor = innerAnchor(roomPolygon(room));
      const candidates = gridSlots(roomPolygon(room), { x: 70, y: 70 }, Math.max(sz.w, sz.h) / 2 + 20, items)
        .sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y));
      const free = candidates.find((p) => taken.every((t) => Math.hypot(t.x - p.x, t.y - p.y) > 175)) || anchor;
      const table: SeatingTable = {
        id: uid(),
        label: `Table ${n}`,
        shape,
        x: free.x - sz.w / 2,
        y: free.y - sz.h / 2,
        rotation: 0,
        seats,
      };
      const tables = [...plan.tables, table];
      await repo.save({ ...plan, tables, updated_at: new Date().toISOString() });
      return tables;
    },

    async removeTable(plan: SeatingPlan, tableId: string): Promise<{ tables: SeatingTable[]; assignments: SeatAssignments }> {
      const tables = plan.tables.filter((t) => t.id !== tableId);
      // Purge les assignations de la table supprimée
      const assignments = Object.fromEntries(
        Object.entries(plan.assignments).filter(([k]) => !k.startsWith(`${tableId}_`))
      );
      await repo.save({ ...plan, tables, assignments, updated_at: new Date().toISOString() });
      return { tables, assignments };
    },

    async moveTable(plan: SeatingPlan, tableId: string, x: number, y: number): Promise<SeatingTable[]> {
      const tables = plan.tables.map((t) => (t.id === tableId ? { ...t, x, y } : t));
      await repo.save({ ...plan, tables, updated_at: new Date().toISOString() });
      return tables;
    },

    /**
     * Assigne un invité à une chaise.
     * Invariant : un invité n'occupe qu'une seule chaise — on purge ses anciennes places.
     */
    async assign(plan: SeatingPlan, tableId: string, seatIndex: number, guestId: string | null): Promise<SeatAssignments> {
      const assignments = { ...plan.assignments };
      // Purge : ce guest_id ne peut être qu'à une seule chaise
      for (const [k, v] of Object.entries(assignments)) {
        if (v === guestId) delete assignments[k];
      }
      const key = seatKey(tableId, seatIndex);
      if (guestId) assignments[key] = guestId;
      else delete assignments[key];
      await repo.updateAssignments(plan.event_id, assignments);
      return assignments;
    },

    /** Persiste un état complet (undo/redo). */
    async save(plan: SeatingPlan): Promise<void> {
      await repo.save({ ...plan, updated_at: new Date().toISOString() });
    },

    /** Chaise occupée par cet invité (ou null) */
    guestSeat(plan: SeatingPlan, guestId: string): string | null {
      const found = Object.entries(plan.assignments).find(([, v]) => v === guestId);
      return found ? found[0] : null;
    },

    /**
     * Génère une salle complète (wizard) : tables en grille centrée
     * + éléments aux positions standard. Recrée le plan, les assignations
     * orphelines des tables disparues sont purgées.
     */
    async generateHall(
      plan: SeatingPlan,
      opts: { tableCount: number; shape: SeatingTable['shape']; seats: number; roomItems: RoomItemType[]; room?: Partial<RoomConfig> }
    ): Promise<SeatingPlan> {
      const { tableCount, shape, seats } = opts;
      const room = normalizeRoom({ ...normalizeRoom(plan.room), ...(opts.room || {}) });
      const poly = roomPolygon(room);
      const anchor = innerAnchor(poly);

      // 1. Éléments de salle, proportionnels à la forme choisie
      const room_items: RoomItem[] = [];
      for (const type of opts.roomItems) room_items.push(buildRoomItem(type, room_items, room, uid()));

      // 2. Tables : grille filtrée par le contour, hors zones des éléments, regroupée autour du centre
      const sz = tableSizeUnits(shape);
      const margin = Math.max(sz.w, sz.h) / 2 + 25;
      const avoid = room_items.map((i) => ({ x: i.x, y: i.y, w: i.w, h: i.h }));
      let spacing = { x: shape === 'round' ? 150 : 190, y: shape === 'round' ? 150 : 130 };
      let slots = gridSlots(poly, spacing, margin, avoid);
      for (let k = 0; slots.length < tableCount && k < 8; k++) {
        spacing = { x: spacing.x * 0.93, y: spacing.y * 0.93 };
        slots = gridSlots(poly, spacing, margin, avoid);
      }
      if (slots.length < tableCount) slots = gridSlots(poly, spacing, margin, []);
      const chosen = [...slots]
        .sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y))
        .slice(0, tableCount)
        .sort((a, b) => Math.round(a.y / 10) - Math.round(b.y / 10) || a.x - b.x);

      const tables: SeatingTable[] = Array.from({ length: tableCount }, (_, i) => {
        const p = chosen[i] || nudgeInside({ x: anchor.x + i * 12, y: anchor.y + i * 12 }, poly);
        return { id: uid(), label: `Table ${i + 1}`, shape, x: Math.round(p.x - sz.w / 2), y: Math.round(p.y - sz.h / 2), rotation: 0, seats };
      });

      const next: SeatingPlan = { ...plan, room, tables, room_items, assignments: {}, updated_at: new Date().toISOString() };
      await repo.save(next);
      return next;
    },

    async addRoomItem(plan: SeatingPlan, type: RoomItemType): Promise<RoomItem[]> {
      const item = buildRoomItem(type, plan.room_items, normalizeRoom(plan.room), uid());
      const room_items = [...plan.room_items, item];
      await repo.save({ ...plan, room_items, updated_at: new Date().toISOString() });
      return room_items;
    },

    async moveRoomItem(plan: SeatingPlan, id: string, x: number, y: number): Promise<RoomItem[]> {
      const room_items = plan.room_items.map((i) => (i.id === id ? { ...i, x, y } : i));
      await repo.save({ ...plan, room_items, updated_at: new Date().toISOString() });
      return room_items;
    },

    async removeRoomItem(plan: SeatingPlan, id: string): Promise<RoomItem[]> {
      const room_items = plan.room_items.filter((i) => i.id !== id);
      await repo.save({ ...plan, room_items, updated_at: new Date().toISOString() });
      return room_items;
    },

    async renameTable(plan: SeatingPlan, tableId: string, label: string): Promise<SeatingTable[]> {
      return this.updateTable(plan, tableId, { label: label || undefined });
    },

    /** Patch générique d'une table (couleur, nb places, rotation, types de chaises). */
    async updateTable(plan: SeatingPlan, tableId: string, patch: Partial<SeatingTable>): Promise<SeatingTable[]> {
      const tables = plan.tables.map((t) => {
        if (t.id !== tableId) return t;
        const merged = { ...t, ...patch };
        // purge les champs explicitement passés à undefined
        Object.keys(patch).forEach((k) => {
          if ((patch as Record<string, unknown>)[k] === undefined) delete (merged as Record<string, unknown>)[k];
        });
        return merged;
      });
      await repo.save({ ...plan, tables, updated_at: new Date().toISOString() });
      return tables;
    },

    /** Bascule le type d'une chaise (enfant / pmr / vip / standard). */
    async setSeatType(plan: SeatingPlan, tableId: string, seatIndex: number, type: SeatType | null): Promise<SeatingTable[]> {
      const tables = plan.tables.map((t) => {
        if (t.id !== tableId) return t;
        const seat_types = { ...(t.seat_types || {}) };
        if (type && type !== 'standard') seat_types[seatIndex] = type;
        else delete seat_types[seatIndex];
        return { ...t, seat_types };
      });
      await repo.save({ ...plan, tables, updated_at: new Date().toISOString() });
      return tables;
    },

    /** Rotation d'un élément — `deg` = angle absolu (poignée) ou delta si `delta: true`. */
    async rotateElement(plan: SeatingPlan, id: string, deg: number, delta = false): Promise<SeatingPlan> {
      const norm = (r: number) => Math.round(((r % 360) + 360) % 360);
      const target = (r: number) => norm(delta ? r + deg : deg);
      const next = {
        ...plan,
        tables: plan.tables.map((t) => (t.id === id ? { ...t, rotation: target(t.rotation) } : t)),
        room_items: plan.room_items.map((i) => (i.id === id ? { ...i, rotation: target(i.rotation) } : i)),
        updated_at: new Date().toISOString(),
      };
      await repo.save(next);
      return next;
    },

    /**
     * Change la forme / les dimensions de la salle. Les éléments qui se retrouvent
     * hors du nouveau contour sont ramenés à l'intérieur (rien ne disparaît).
     */
    async setRoom(plan: SeatingPlan, room: Partial<RoomConfig>): Promise<SeatingPlan> {
      const next = normalizeRoom({ ...normalizeRoom(plan.room), ...room });
      const poly = roomPolygon(next);
      const tables = plan.tables.map((t) => {
        const s = tableSizeUnits(t.shape);
        const c = nudgeInside(centerOfTable(t), poly, Math.max(s.w, s.h) / 2 + 10);
        return { ...t, x: c.x - s.w / 2, y: c.y - s.h / 2 };
      });
      const room_items = plan.room_items.map((i) => {
        const c = nudgeInside({ x: i.x + i.w / 2, y: i.y + i.h / 2 }, poly, 6);
        return { ...i, x: c.x - i.w / 2, y: c.y - i.h / 2 };
      });
      const result: SeatingPlan = { ...plan, room: next, tables, room_items, updated_at: new Date().toISOString() };
      await repo.save(result);
      return result;
    },

    /** Met à jour le décor 3D (sol, murs, chaises, tables, centre de table, ambiance). */
    async setDecor(plan: SeatingPlan, patch: Partial<DecorConfig>): Promise<SeatingPlan> {
      const decor: DecorConfig = { ...DEFAULT_DECOR, ...(plan.decor || {}), ...patch };
      const result: SeatingPlan = { ...plan, decor, updated_at: new Date().toISOString() };
      await repo.save(result);
      return result;
    },

    /**
     * Duplique une table (sans ses invités) ou un élément de salle.
     * Retourne le plan mis à jour + l'id du nouvel élément (pour le sélectionner).
     */
    async duplicateElement(plan: SeatingPlan, id: string): Promise<{ plan: SeatingPlan; newId: string | null }> {
      const poly = roomPolygon(normalizeRoom(plan.room));
      const table = plan.tables.find((t) => t.id === id);
      if (table) {
        const s = tableSizeUnits(table.shape);
        const c = nudgeInside({ x: table.x + s.w / 2 + 40, y: table.y + s.h / 2 + 40 }, poly, Math.max(s.w, s.h) / 2 + 10);
        const copy: SeatingTable = { ...table, id: uid(), label: `Table ${plan.tables.length + 1}`, x: c.x - s.w / 2, y: c.y - s.h / 2 };
        const result = { ...plan, tables: [...plan.tables, copy], updated_at: new Date().toISOString() };
        await repo.save(result);
        return { plan: result, newId: copy.id };
      }
      const item = plan.room_items.find((i) => i.id === id);
      if (!item) return { plan, newId: null };
      const c = nudgeInside({ x: item.x + item.w / 2 + 30, y: item.y + item.h / 2 + 30 }, poly, 6);
      const copy: RoomItem = { ...item, id: uid(), x: c.x - item.w / 2, y: c.y - item.h / 2 };
      const result = { ...plan, room_items: [...plan.room_items, copy], updated_at: new Date().toISOString() };
      await repo.save(result);
      return { plan: result, newId: copy.id };
    },

    /** Définit / supprime l'image de fond de la salle (chemin Storage). */
    async setBackground(plan: SeatingPlan, path: string | null): Promise<void> {
      await repo.save({ ...plan, background_path: path, updated_at: new Date().toISOString() });
    },

    /**
     * Répartition automatique : remplit les chaises libres en regroupant
     * les invités par `side` (côté mariée / marié) sur les mêmes tables.
     */
    async autoAssign(plan: SeatingPlan, guests: SeatingGuest[]): Promise<SeatAssignments> {
      const assignments = { ...plan.assignments };
      const placed = new Set(Object.values(assignments));
      let unseated = guests.filter((g) => !placed.has(g.id));

      const freeSeatOf = (t: SeatingTable) => {
        for (let s = 0; s < t.seats; s++) if (!assignments[seatKey(t.id, s)]) return s;
        return -1;
      };

      // Passe 0 — invités avec une table nommée dans la page Invités ("Table 1", "Famille"…)
      // → on les place à la table dont le label correspond (insensible à la casse).
      const labelOf = (l: string) => l.trim().toLowerCase();
      for (const g of [...unseated]) {
        if (!g.table) continue;
        const t = plan.tables.find((x) => labelOf(x.label) === labelOf(g.table!));
        if (!t) continue;
        const s = freeSeatOf(t);
        if (s < 0) continue; // table pleine → l'invité passera par le tri général
        assignments[seatKey(t.id, s)] = g.id;
        unseated = unseated.filter((x) => x.id !== g.id);
      }

      // Ordre : les groupes les plus gros d'abord (se placent mieux ensemble)
      const order = [...unseated].sort((a, b) => {
        const ca = unseated.filter((x) => x.side && x.side === a.side).length;
        const cb = unseated.filter((x) => x.side && x.side === b.side).length;
        return cb - ca;
      });

      const guestSide = (id: string) => guests.find((x) => x.id === id)?.side;

      for (const g of order) {
        // Score chaque table : +2 par occupant du même côté → privilégie le regroupement
        let best: { tableId: string; seatIndex: number; score: number } | null = null;
        for (const t of plan.tables) {
          let score = 0;
          for (let s = 0; s < t.seats; s++) {
            const occ = assignments[seatKey(t.id, s)];
            if (occ && guestSide(occ) === g.side && g.side) score += 2;
          }
          const s = freeSeatOf(t);
          if (s >= 0 && (!best || score > best.score)) best = { tableId: t.id, seatIndex: s, score };
        }
        if (!best) break; // plus de place
        assignments[seatKey(best.tableId, best.seatIndex)] = g.id;
      }

      await repo.updateAssignments(plan.event_id, assignments);
      return assignments;
    },
  };
}
