/**
 * Domaine Plan de table — types purs, aucune dépendance Firestore.
 * Schéma : docs/FIRESTORE_SCHEMA.md §2 `seating_plans/{event_id}`.
 */

export type TableShape = 'round' | 'oval' | 'rect' | 'head';

/** Type de chaise : standard, enfant (chaise haute), PMR, VIP. */
export type SeatType = 'standard' | 'enfant' | 'pmr' | 'vip';

export interface SeatingTable {
  id: string;
  label: string;
  shape: TableShape;
  x: number;           // position canvas (% du plan)
  y: number;
  rotation: number;    // degrés
  seats: number;       // nb de chaises
  color?: string;
  /** Type par index de chaise — absent = 'standard'. */
  seat_types?: Record<number, SeatType>;
}

export type RoomItemType =
  | 'dancefloor' | 'bar' | 'buffet' | 'stage' | 'dj' | 'entrance' | 'photobooth';

export interface RoomItem {
  id: string;
  type: RoomItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  label?: string;
}

/** 1 chaise = 1 invité. Clé = `${tableId}_${seatIndex}` */
export type SeatAssignments = Record<string, string>;

export interface SeatingPlan {
  event_id: string;
  owner_id: string;
  tables: SeatingTable[];
  room_items: RoomItem[];
  assignments: SeatAssignments;
  background_path?: string | null;
  updated_at: string;
}

export const seatKey = (tableId: string, seatIndex: number) =>
  `${tableId}_${seatIndex}`;

export const TABLE_SHAPES: { value: TableShape; label: string; defaultSeats: number }[] = [
  { value: 'round', label: 'Ronde', defaultSeats: 8 },
  { value: 'rect', label: 'Rectangulaire', defaultSeats: 8 },
  { value: 'oval', label: 'Ovale', defaultSeats: 10 },
  { value: 'head', label: "Table d'honneur", defaultSeats: 6 },
];
