import {
  computeDietarySummary,
  createDefaultCourses,
  getCourseLabel,
  isValidDishStatus,
  normalizeCourses,
  validateDishInput,
} from '../domain/menu-rules';
import type {
  Course,
  CourseKey,
  DecisionPage,
  DietarySummary,
  Dish,
  DishStatus,
  MenuDecision,
  WeddingMenu,
} from '../domain/types';
import type {
  GuestDietaryReader,
  MenuDecisionRepository,
  MenuReader,
  MenuWriter,
} from '../repositories/menu.repository.interface';

export interface MenuServiceDeps {
  reader: MenuReader;
  writer: MenuWriter;
  decisions: MenuDecisionRepository;
  guests: GuestDietaryReader;
}

export interface AddDishInput {
  name: string;
  note?: string;
  status?: DishStatus;
}

export interface UpdateDishPatch {
  name?: string;
  note?: string;
  status?: DishStatus;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class MenuService {
  constructor(private readonly deps: MenuServiceDeps) {}

  async getOrInitMenu(eventId: string, ownerId: string): Promise<WeddingMenu> {
    if (!eventId) throw new Error('Identifiant de mariage requis.');
    if (!ownerId) throw new Error('Identifiant propriétaire requis.');

    const existing = await this.deps.reader.getByEventId(eventId);
    if (existing) {
      return {
        ...existing,
        courses: normalizeCourses(existing.courses),
        dietary_notes: existing.dietary_notes ?? '',
      };
    }

    const now = new Date().toISOString();
    const initial: WeddingMenu = {
      event_id: eventId,
      owner_id: ownerId,
      courses: createDefaultCourses(),
      dietary_notes: '',
      updated_at: now,
    };
    return this.deps.writer.create(initial);
  }

  async addDish(
    eventId: string,
    courseKey: CourseKey,
    input: AddDishInput,
    actorLabel = 'Mariés'
  ): Promise<{ courses: Course[]; dish: Dish; decision: MenuDecision | null }> {
    const menu = await this.requireMenu(eventId);
    const { name, note } = validateDishInput(input.name, input.note ?? '');
    const status: DishStatus = input.status ?? 'envisage';
    if (!isValidDishStatus(status)) {
      throw new Error('Statut de plat invalide.');
    }

    const dish: Dish = {
      id: generateId(),
      name,
      note,
      status,
    };

    const nextCourses = menu.courses.map((c) =>
      c.key === courseKey ? { ...c, dishes: [...c.dishes, dish] } : c
    );
    const now = new Date().toISOString();
    await this.deps.writer.updateCourses(eventId, nextCourses, now);

    let decision: MenuDecision | null = null;
    if (status === 'retenu') {
      decision = await this.deps.decisions.addDecision(eventId, {
        at: now,
        by: actorLabel,
        change: `${getCourseLabel(courseKey)} : "${dish.name}" retenu pour le menu`,
      });
    }

    return { courses: nextCourses, dish, decision };
  }

  async updateDish(
    eventId: string,
    courseKey: CourseKey,
    dishId: string,
    patch: UpdateDishPatch,
    actorLabel = 'Mariés'
  ): Promise<{ courses: Course[]; dish: Dish; decision: MenuDecision | null }> {
    const menu = await this.requireMenu(eventId);
    const targetCourse = menu.courses.find((c) => c.key === courseKey);
    if (!targetCourse) throw new Error('Service introuvable.');

    const existingDish = targetCourse.dishes.find((d) => d.id === dishId);
    if (!existingDish) throw new Error('Plat introuvable.');

    const nextStatus = patch.status ?? existingDish.status;
    if (!isValidDishStatus(nextStatus)) {
      throw new Error('Statut de plat invalide.');
    }

    const { name, note } = validateDishInput(
      patch.name ?? existingDish.name,
      patch.note ?? existingDish.note
    );

    const updatedDish: Dish = {
      ...existingDish,
      name,
      note,
      status: nextStatus,
    };

    const nextCourses = menu.courses.map((c) =>
      c.key === courseKey
        ? {
            ...c,
            dishes: c.dishes.map((d) => (d.id === dishId ? updatedDish : d)),
          }
        : c
    );

    const now = new Date().toISOString();
    await this.deps.writer.updateCourses(eventId, nextCourses, now);

    let decision: MenuDecision | null = null;
    if (existingDish.status !== nextStatus) {
      const courseLabel = getCourseLabel(courseKey);
      if (nextStatus === 'retenu') {
        decision = await this.deps.decisions.addDecision(eventId, {
          at: now,
          by: actorLabel,
          change: `${courseLabel} : "${updatedDish.name}" validé et retenu`,
        });
      } else if (existingDish.status === 'retenu') {
        decision = await this.deps.decisions.addDecision(eventId, {
          at: now,
          by: actorLabel,
          change: `${courseLabel} : "${updatedDish.name}" retiré de la sélection retenue`,
        });
      }
    }

    return { courses: nextCourses, dish: updatedDish, decision };
  }

  async removeDish(
    eventId: string,
    courseKey: CourseKey,
    dishId: string,
    actorLabel = 'Mariés'
  ): Promise<{ courses: Course[]; decision: MenuDecision | null }> {
    const menu = await this.requireMenu(eventId);
    const targetCourse = menu.courses.find((c) => c.key === courseKey);
    if (!targetCourse) throw new Error('Service introuvable.');

    const existingDish = targetCourse.dishes.find((d) => d.id === dishId);
    if (!existingDish) throw new Error('Plat introuvable.');

    const nextCourses = menu.courses.map((c) =>
      c.key === courseKey
        ? { ...c, dishes: c.dishes.filter((d) => d.id !== dishId) }
        : c
    );

    const now = new Date().toISOString();
    await this.deps.writer.updateCourses(eventId, nextCourses, now);

    let decision: MenuDecision | null = null;
    if (existingDish.status === 'retenu') {
      decision = await this.deps.decisions.addDecision(eventId, {
        at: now,
        by: actorLabel,
        change: `${getCourseLabel(courseKey)} : suppression du plat retenu "${existingDish.name}"`,
      });
    }

    return { courses: nextCourses, decision };
  }

  async updateDietaryNotes(
    eventId: string,
    dietaryNotes: string,
    actorLabel = 'Mariés'
  ): Promise<{ dietary_notes: string; decision: MenuDecision | null }> {
    const menu = await this.requireMenu(eventId);
    const clean = dietaryNotes.trim();
    if (clean.length > 2000) {
      throw new Error('Les consignes traiteur ne peuvent pas dépasser 2000 caractères.');
    }

    const now = new Date().toISOString();
    await this.deps.writer.updateDietaryNotes(eventId, clean, now);

    let decision: MenuDecision | null = null;
    if (clean !== (menu.dietary_notes ?? '').trim()) {
      decision = await this.deps.decisions.addDecision(eventId, {
        at: now,
        by: actorLabel,
        change: 'Mise à jour des consignes diététiques et notes traiteur',
      });
    }

    return { dietary_notes: clean, decision };
  }

  async addManualDecision(
    eventId: string,
    actorLabel: string,
    change: string
  ): Promise<MenuDecision> {
    await this.requireMenu(eventId);
    const cleanChange = change.trim();
    if (!cleanChange) {
      throw new Error('Le libellé de la décision est obligatoire.');
    }
    if (cleanChange.length > 300) {
      throw new Error('Le libellé de la décision ne peut pas dépasser 300 caractères.');
    }
    return this.deps.decisions.addDecision(eventId, {
      at: new Date().toISOString(),
      by: actorLabel.trim() || 'Mariés',
      change: cleanChange,
    });
  }

  async listDecisions(
    eventId: string,
    options?: { limitCount?: number; cursor?: string | null }
  ): Promise<DecisionPage> {
    return this.deps.decisions.listDecisions(eventId, options);
  }

  async getDietarySummary(
    eventId: string,
    fallbackClientId?: string
  ): Promise<DietarySummary> {
    const guests = await this.deps.guests.listGuestsForEvent(
      eventId,
      fallbackClientId
    );
    return computeDietarySummary(guests);
  }

  private async requireMenu(eventId: string): Promise<WeddingMenu> {
    const menu = await this.deps.reader.getByEventId(eventId);
    if (!menu) {
      throw new Error('Menu introuvable pour cet événement.');
    }
    return {
      ...menu,
      courses: normalizeCourses(menu.courses),
    };
  }
}

