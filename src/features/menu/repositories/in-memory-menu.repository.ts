import type {
  Course,
  DecisionPage,
  GuestDietarySource,
  MenuDecision,
  WeddingMenu,
} from '../domain/types';
import type {
  GuestDietaryReader,
  MenuDecisionRepository,
  MenuReader,
  MenuWriter,
} from './menu.repository.interface';

export class InMemoryMenuRepository
  implements MenuReader, MenuWriter, MenuDecisionRepository, GuestDietaryReader
{
  private menus = new Map<string, WeddingMenu>();
  private decisions = new Map<string, MenuDecision[]>();
  private guests = new Map<string, GuestDietarySource[]>();
  private seq = 0;

  seedGuests(eventId: string, items: GuestDietarySource[]): void {
    this.guests.set(eventId, items.map((g) => ({ ...g })));
  }

  async getByEventId(eventId: string): Promise<WeddingMenu | null> {
    const m = this.menus.get(eventId);
    return m ? structuredClone(m) : null;
  }

  async create(menu: WeddingMenu): Promise<WeddingMenu> {
    const copy = structuredClone(menu);
    this.menus.set(menu.event_id, copy);
    return structuredClone(copy);
  }

  async updateCourses(
    eventId: string,
    courses: Course[],
    updatedAt: string
  ): Promise<void> {
    const existing = this.menus.get(eventId);
    if (!existing) throw new Error('Menu introuvable.');
    existing.courses = structuredClone(courses);
    existing.updated_at = updatedAt;
  }

  async updateDietaryNotes(
    eventId: string,
    dietaryNotes: string,
    updatedAt: string
  ): Promise<void> {
    const existing = this.menus.get(eventId);
    if (!existing) throw new Error('Menu introuvable.');
    existing.dietary_notes = dietaryNotes;
    existing.updated_at = updatedAt;
  }

  async addDecision(
    eventId: string,
    decision: Omit<MenuDecision, 'id'>
  ): Promise<MenuDecision> {
    this.seq += 1;
    const item: MenuDecision = {
      id: `dec_${this.seq}`,
      ...decision,
    };
    const list = this.decisions.get(eventId) ?? [];
    list.unshift(item);
    this.decisions.set(eventId, list);
    return { ...item };
  }

  async listDecisions(
    eventId: string,
    options?: { limitCount?: number; cursor?: string | null }
  ): Promise<DecisionPage> {
    const limitCount = options?.limitCount ?? 20;
    const all = [...(this.decisions.get(eventId) ?? [])].sort((a, b) =>
      b.at.localeCompare(a.at)
    );
    let startIndex = 0;
    if (options?.cursor) {
      const idx = all.findIndex((d) => d.id === options.cursor);
      startIndex = idx >= 0 ? idx + 1 : 0;
    }
    const slice = all.slice(startIndex, startIndex + limitCount);
    const hasMore = startIndex + limitCount < all.length;
    return {
      items: slice.map((d) => ({ ...d })),
      nextCursor: hasMore && slice.length > 0 ? slice[slice.length - 1].id : null,
      hasMore,
    };
  }

  async listGuestsForEvent(eventId: string): Promise<GuestDietarySource[]> {
    return (this.guests.get(eventId) ?? []).map((g) => ({ ...g }));
  }
}

