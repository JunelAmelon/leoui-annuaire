/**
 * Service Plan de table — cas d'usage métier.
 * DIP : dépend de l'interface SeatingRepository, jamais de Firestore directement.
 */

import type { SeatingPlan, SeatingTable, RoomItem, RoomItemType, SeatAssignments, SeatType } from '../domain/types';
import type { SeatingRepository, SeatingGuest } from '../repositories/seating.repository';
import { seatKey } from '../domain/types';

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

/** Position par défaut d'un élément selon son rôle dans la salle. */
function roomItemDefaultPos(type: RoomItemType, existing: RoomItem[]): { x: number; y: number } {
  const n = existing.filter((i) => i.type === type).length;
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
      const table: SeatingTable = {
        id: uid(),
        label: `Table ${n}`,
        shape,
        x: 15 + (plan.tables.length % 5) * 15,
        y: 15 + Math.floor(plan.tables.length / 5) * 20,
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
      opts: { tableCount: number; shape: SeatingTable['shape']; seats: number; roomItems: RoomItemType[] }
    ): Promise<SeatingPlan> {
      const { tableCount, shape, seats } = opts;
      const cols = Math.max(1, Math.ceil(Math.sqrt(tableCount * 1.6)));
      const rows = Math.ceil(tableCount / cols);
      const spacingX = shape === 'round' ? 150 : 190;
      const spacingY = shape === 'round' ? 150 : 130;
      const gridW = cols * spacingX;
      const gridH = rows * spacingY;
      const x0 = 500 - gridW / 2;
      const y0 = Math.max(200, 350 - gridH / 2);

      const tables: SeatingTable[] = [];
      for (let i = 0; i < tableCount; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const rowCount = Math.min(cols, tableCount - row * cols);
        const offset = ((cols - rowCount) * spacingX) / 2;
        tables.push({
          id: uid(),
          label: `Table ${i + 1}`,
          shape,
          x: Math.round(x0 + offset + col * spacingX + spacingX / 2 - 40),
          y: Math.round(y0 + row * spacingY),
          rotation: 0,
          seats,
        });
      }

      const room_items: RoomItem[] = opts.roomItems.map((type, i) => {
        const def = ROOM_ITEM_DEFS[type];
        const pos = roomItemDefaultPos(type, room_items);
        return { id: uid(), type, x: pos.x, y: pos.y, w: def.w, h: def.h, rotation: 0, label: def.label };
      });

      const next: SeatingPlan = { ...plan, tables, room_items, assignments: {}, updated_at: new Date().toISOString() };
      await repo.save(next);
      return next;
    },

    async addRoomItem(plan: SeatingPlan, type: RoomItemType): Promise<RoomItem[]> {
      const def = ROOM_ITEM_DEFS[type];
      const pos = roomItemDefaultPos(type, plan.room_items);
      const item: RoomItem = { id: uid(), type, x: pos.x, y: pos.y, w: def.w, h: def.h, rotation: 0, label: def.label };
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
