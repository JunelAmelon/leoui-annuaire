export type CourseKey =
  | 'vin_honneur'
  | 'entree'
  | 'plat'
  | 'fromage'
  | 'dessert'
  | 'cafe';

export type DishStatus = 'envisage' | 'a_valider' | 'retenu';

export interface Dish {
  id: string;
  name: string;
  note: string;
  status: DishStatus;
}

export interface Course {
  id: string;
  key: CourseKey;
  dishes: Dish[];
}

export interface WeddingMenu {
  event_id: string;
  owner_id: string;
  courses: Course[];
  dietary_notes: string;
  updated_at: string;
}

export interface MenuDecision {
  id: string;
  at: string;
  by: string;
  change: string;
}

export interface DecisionPage {
  items: MenuDecision[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type DietaryCategory =
  | 'Standard'
  | 'Végétarien'
  | 'Vegan'
  | 'Sans gluten'
  | 'Enfant'
  | 'Autre';

export interface GuestDietarySource {
  id: string;
  name: string;
  rsvp: 'confirmed' | 'pending' | 'declined';
  menu?: string;
  menu_other?: string;
}

export interface GuestDietaryDetail {
  guest_id: string;
  guest_name: string;
  rsvp: 'confirmed' | 'pending';
  menu: string;
  menu_other: string;
}

export interface DietaryCategoryCount {
  category: DietaryCategory;
  confirmed: number;
  pending: number;
}

export interface DietarySummary {
  total_confirmed: number;
  total_pending: number;
  categories: DietaryCategoryCount[];
  special_requests: GuestDietaryDetail[];
}

export interface MenuDishCounts {
  total: number;
  retenu: number;
  a_valider: number;
  envisage: number;
}

