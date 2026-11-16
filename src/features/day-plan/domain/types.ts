/**
 * Planning du jour J — entités du domaine (aucun import Firebase).
 * Source de vérité : docs/FIRESTORE_SCHEMA.md §3 (`day_plans/{event_id}`).
 */

export type DayKey = 'eve' | 'day' | 'after';
export const DAY_KEYS: DayKey[] = ['eve', 'day', 'after'];
export const DAY_LABELS: Record<DayKey, string> = { eve: 'La veille', day: 'Le jour J', after: 'Le lendemain' };
/** Décalage en jours par rapport à la date du mariage. */
export const DAY_OFFSETS: Record<DayKey, number> = { eve: -1, day: 0, after: 1 };

export type TimelineCategory =
  | 'preparation' | 'ceremony' | 'photo' | 'cocktail' | 'meal' | 'party' | 'transport' | 'logistics' | 'other';

/**
 * Référentiel des catégories. Ajouter une catégorie = ajouter une entrée ici (OCP).
 * `guest_facing` : le moment peut figurer dans le programme public (Gazette).
 * `musical` : le moment est proposé comme repère dans la Playlist.
 */
export const CATEGORIES: Record<TimelineCategory, { label: string; color: string; guest_facing: boolean; musical: boolean }> = {
  preparation: { label: 'Préparatifs', color: '#B08968', guest_facing: false, musical: false },
  ceremony:    { label: 'Cérémonie',   color: '#BE123C', guest_facing: true,  musical: true },
  photo:       { label: 'Photos',      color: '#6B7A8F', guest_facing: false, musical: false },
  cocktail:    { label: 'Cocktail',    color: '#C98A2B', guest_facing: true,  musical: true },
  meal:        { label: 'Repas',       color: '#7A8B5B', guest_facing: true,  musical: true },
  party:       { label: 'Soirée',      color: '#6D4C7D', guest_facing: true,  musical: true },
  transport:   { label: 'Trajet',      color: '#4F6D7A', guest_facing: false, musical: false },
  logistics:   { label: 'Logistique',  color: '#78716C', guest_facing: false, musical: false },
  other:       { label: 'Autre',       color: '#A8A29E', guest_facing: true,  musical: false },
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as TimelineCategory[];

export interface TimelineLocation {
  name: string;
  address: string;
  /** Temps de trajet (minutes) pour rejoindre ce lieu depuis le lieu du moment précédent. */
  travel_min: number;
}

export interface TimelineItem {
  /** Identifiant STABLE : référencé par la Playlist (`linked_moment_id`) et l'album photo. */
  id: string;
  title: string;
  /** Heure locale du lieu, ISO 8601 sans décalage : `YYYY-MM-DDTHH:mm:00`. Gère l'après-minuit par la date. */
  start_at: string;
  end_at: string | null;
  duration_min: number;
  category: TimelineCategory;
  location: TimelineLocation;
  people: string[];
  notes: string;
  /** Identifiants des intervenants (`share.vendor_links[].vendor_id`). */
  vendor_ids: string[];
  sort_key: number;
}

export interface DayBlock {
  /** `YYYY-MM-DD` */
  date: string;
  items: TimelineItem[];
}

export interface VendorLink {
  vendor_id: string;
  /** Nom affiché de l'intervenant (ex. « Traiteur Maison Dupont »). */
  label: string;
  token: string;
  token_revoked_at: string | null;
}

export interface DayPlanShare {
  /** Lien général en lecture seule (témoins, famille). `null` = jamais activé. */
  token: string | null;
  token_revoked_at: string | null;
  vendor_links: VendorLink[];
}

export interface DayPlan {
  event_id: string;
  owner_id: string;
  days: Record<DayKey, DayBlock>;
  share: DayPlanShare;
  created_at: string;
  updated_at: string;
}

export type VendorRequestStatus = 'pending' | 'accepted' | 'declined';

/** Proposition de décalage horaire émise par un prestataire (sous-collection `vendor_requests`). */
export interface VendorRequest {
  id: string;
  event_id: string;
  owner_id: string;
  vendor_id: string;
  vendor_label: string;
  item_id: string;
  proposed_start_at: string;
  reason: string;
  status: VendorRequestStatus;
  created_at: string;
  decided_at: string | null;
}

/** Saisie d'un moment depuis l'UI (heure `HH:mm`, la date est déduite du jour). */
export interface TimelineItemInput {
  title: string;
  time: string;
  duration_min: number;
  category: TimelineCategory;
  location_name: string;
  location_address: string;
  travel_min: number;
  people: string[];
  notes: string;
  vendor_ids: string[];
}

export const LIMITS = {
  ITEMS_PER_DAY: 60,
  TITLE: 120,
  NOTES: 1000,
  PEOPLE: 20,
  VENDOR_LINKS: 30,
  REASON: 400,
  PENDING_REQUESTS_PER_VENDOR: 10,
} as const;
