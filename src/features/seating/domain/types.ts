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

/** Forme de la salle (contour au sol). Dimensions en mètres. */
export type RoomShape = 'rect' | 'square' | 'l' | 'u' | 't' | 'oval';

export interface RoomConfig {
  shape: RoomShape;
  width_m: number;
  length_m: number;
}

export const DEFAULT_ROOM: RoomConfig = { shape: 'rect', width_m: 20, length_m: 14 };

export const ROOM_LIMITS = { min_m: 8, max_m: 60 } as const;

export const ROOM_SHAPES: { value: RoomShape; label: string }[] = [
  { value: 'rect', label: 'Rectangle' },
  { value: 'square', label: 'Carré' },
  { value: 'l', label: 'En L' },
  { value: 'u', label: 'En U' },
  { value: 't', label: 'En T' },
  { value: 'oval', label: 'Ovale' },
];

export type FloorStyle = 'dalles' | 'parquet_chevron' | 'parquet_clair' | 'marbre' | 'beton_cire' | 'tapis_sable';
export type TableSurfaceStyle = 'nappe' | 'bois_verni' | 'bois_chene' | 'marbre_or';
export type ChairStyle = 'napoleon' | 'chiavari_bois' | 'chiavari_or' | 'chiavari_noire' | 'medaillon' | 'ghost';
export type CenterpieceStyle = 'candelabre' | 'boule_blanche' | 'couronne_basse' | 'eucalyptus' | 'bougeoirs' | 'aucun';
export type Mood = 'jour' | 'soiree';

/** Décor global de la salle — appliqué à la vue 3D. */
export interface DecorConfig {
  floor: FloorStyle;
  wall_color: string;
  table_style: TableSurfaceStyle;
  cloth_color: string;
  chair_style: ChairStyle;
  centerpiece: CenterpieceStyle;
  flower_color: string;
  mood: Mood;
}

export const DEFAULT_DECOR: DecorConfig = {
  floor: 'parquet_clair',
  wall_color: '#F3EFE9',
  table_style: 'nappe',
  cloth_color: '#F7F3EE',
  chair_style: 'chiavari_bois',
  centerpiece: 'boule_blanche',
  flower_color: '#E8B4B8',
  mood: 'jour',
};

export interface SeatingPlan {
  event_id: string;
  owner_id: string;
  tables: SeatingTable[];
  room_items: RoomItem[];
  assignments: SeatAssignments;
  /** Absent sur les anciens plans → DEFAULT_ROOM (20 × 14 m). */
  room?: RoomConfig;
  /** Absent sur les anciens plans → DEFAULT_DECOR. */
  decor?: DecorConfig;
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
