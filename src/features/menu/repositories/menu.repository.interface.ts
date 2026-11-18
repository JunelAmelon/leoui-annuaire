import type {
  Course,
  DecisionPage,
  GuestDietarySource,
  MenuDecision,
  WeddingMenu,
} from '../domain/types';

export interface MenuReader {
  getByEventId(eventId: string): Promise<WeddingMenu | null>;
}

export interface MenuWriter {
  create(menu: WeddingMenu): Promise<WeddingMenu>;
  updateCourses(
    eventId: string,
    courses: Course[],
    updatedAt: string
  ): Promise<void>;
  updateDietaryNotes(
    eventId: string,
    dietaryNotes: string,
    updatedAt: string
  ): Promise<void>;
}

export interface MenuDecisionRepository {
  addDecision(
    eventId: string,
    decision: Omit<MenuDecision, 'id'>
  ): Promise<MenuDecision>;
  listDecisions(
    eventId: string,
    options?: { limitCount?: number; cursor?: string | null }
  ): Promise<DecisionPage>;
}

export interface GuestDietaryReader {
  listGuestsForEvent(
    eventId: string,
    fallbackClientId?: string
  ): Promise<GuestDietarySource[]>;
}

