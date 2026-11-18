import type {
  Course,
  CourseKey,
  DietaryCategory,
  DietarySummary,
  Dish,
  DishStatus,
  GuestDietaryDetail,
  GuestDietarySource,
  MenuDishCounts,
} from './types';

export interface CourseDefinition {
  key: CourseKey;
  label: string;
  subtitle: string;
}

export const COURSE_DEFINITIONS: readonly CourseDefinition[] = [
  {
    key: 'vin_honneur',
    label: "Vin d'honneur",
    subtitle: 'Pièces cocktails, ateliers et rafraîchissements',
  },
  {
    key: 'entree',
    label: 'Entrée',
    subtitle: 'Mise en bouche et première assiette',
  },
  {
    key: 'plat',
    label: 'Plat principal',
    subtitle: 'Viande, poisson ou création végétale et garnitures',
  },
  {
    key: 'fromage',
    label: 'Fromages',
    subtitle: 'Affinages, mesclun et pains spéciaux',
  },
  {
    key: 'dessert',
    label: 'Dessert',
    subtitle: 'Pièce montée, wedding cake ou farandole sucrée',
  },
  {
    key: 'cafe',
    label: 'Café & Mignardises',
    subtitle: 'Boissons chaudes, digestifs et douceurs de fin de repas',
  },
] as const;

export const DISH_STATUS_META: Record<
  DishStatus,
  { label: string; shortLabel: string; next: DishStatus }
> = {
  envisage: {
    label: 'Envisagé',
    shortLabel: 'Envisagé',
    next: 'a_valider',
  },
  a_valider: {
    label: 'À valider',
    shortLabel: 'À valider',
    next: 'retenu',
  },
  retenu: {
    label: 'Retenu',
    shortLabel: 'Retenu',
    next: 'envisage',
  },
};

export const DIETARY_CATEGORIES: readonly DietaryCategory[] = [
  'Standard',
  'Végétarien',
  'Vegan',
  'Sans gluten',
  'Enfant',
  'Autre',
] as const;

export function createDefaultCourses(): Course[] {
  return COURSE_DEFINITIONS.map((def) => ({
    id: def.key,
    key: def.key,
    dishes: [],
  }));
}

export function getCourseLabel(key: CourseKey): string {
  return COURSE_DEFINITIONS.find((c) => c.key === key)?.label ?? key;
}

export function normalizeCourses(rawCourses?: Course[]): Course[] {
  const byKey = new Map<CourseKey, Course>();
  for (const c of rawCourses ?? []) {
    if (c?.key) {
      byKey.set(c.key, {
        id: c.id || c.key,
        key: c.key,
        dishes: Array.isArray(c.dishes) ? c.dishes : [],
      });
    }
  }
  return COURSE_DEFINITIONS.map((def) => {
    const existing = byKey.get(def.key);
    return (
      existing ?? {
        id: def.key,
        key: def.key,
        dishes: [],
      }
    );
  });
}

export function validateDishInput(
  name: string,
  note: string
): { name: string; note: string } {
  const cleanName = name.trim();
  const cleanNote = note.trim();
  if (!cleanName) {
    throw new Error('Le nom du plat est obligatoire.');
  }
  if (cleanName.length > 140) {
    throw new Error('Le nom du plat ne peut pas dépasser 140 caractères.');
  }
  if (cleanNote.length > 400) {
    throw new Error('La note de dégustation ne peut pas dépasser 400 caractères.');
  }
  return { name: cleanName, note: cleanNote };
}

export function isValidDishStatus(status: string): status is DishStatus {
  return status === 'envisage' || status === 'a_valider' || status === 'retenu';
}

export function countMenuDishes(courses: Course[]): MenuDishCounts {
  const counts: MenuDishCounts = {
    total: 0,
    retenu: 0,
    a_valider: 0,
    envisage: 0,
  };
  for (const course of courses) {
    for (const dish of course.dishes) {
      counts.total += 1;
      counts[dish.status] += 1;
    }
  }
  return counts;
}

function resolveDietaryCategory(rawMenu?: string): DietaryCategory {
  const normalized = (rawMenu ?? '').trim();
  const match = DIETARY_CATEGORIES.find(
    (cat) => cat.toLowerCase() === normalized.toLowerCase()
  );
  return match ?? (normalized ? 'Autre' : 'Standard');
}

export function computeDietarySummary(
  guests: GuestDietarySource[]
): DietarySummary {
  const countsMap = new Map<
    DietaryCategory,
    { confirmed: number; pending: number }
  >();
  for (const cat of DIETARY_CATEGORIES) {
    countsMap.set(cat, { confirmed: 0, pending: 0 });
  }

  const special_requests: GuestDietaryDetail[] = [];
  let total_confirmed = 0;
  let total_pending = 0;

  for (const guest of guests) {
    if (guest.rsvp === 'declined') continue;
    const isConfirmed = guest.rsvp === 'confirmed';
    if (isConfirmed) {
      total_confirmed += 1;
    } else {
      total_pending += 1;
    }

    const category = resolveDietaryCategory(guest.menu);
    const bucket = countsMap.get(category)!;
    if (isConfirmed) {
      bucket.confirmed += 1;
    } else {
      bucket.pending += 1;
    }

    const other = (guest.menu_other ?? '').trim();
    if (other || category === 'Autre' || category === 'Sans gluten' || category === 'Vegan') {
      special_requests.push({
        guest_id: guest.id,
        guest_name: guest.name,
        rsvp: isConfirmed ? 'confirmed' : 'pending',
        menu: category,
        menu_other: other,
      });
    }
  }

  return {
    total_confirmed,
    total_pending,
    categories: DIETARY_CATEGORIES.map((category) => ({
      category,
      confirmed: countsMap.get(category)!.confirmed,
      pending: countsMap.get(category)!.pending,
    })),
    special_requests: special_requests.sort((a, b) =>
      a.guest_name.localeCompare(b.guest_name, 'fr')
    ),
  };
}

export function findDishInCourses(
  courses: Course[],
  dishId: string
): { course: Course; dish: Dish } | null {
  for (const course of courses) {
    const dish = course.dishes.find((d) => d.id === dishId);
    if (dish) return { course, dish };
  }
  return null;
}

