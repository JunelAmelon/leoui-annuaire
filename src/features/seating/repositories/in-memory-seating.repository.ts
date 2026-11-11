/**
 * Repository en mémoire pour les tests unitaires du service Plan de table.
 * Implémente SeatingRepository — DIP respecté, aucun accès Firestore.
 */

import type { SeatingPlan, SeatAssignments } from '../domain/types';
import type { SeatingRepository } from './seating.repository';

export class InMemorySeatingRepository implements SeatingRepository {
  private plans: Map<string, SeatingPlan> = new Map();

  async getByEventId(eventId: string): Promise<SeatingPlan | null> {
    return this.plans.get(eventId) || null;
  }

  async save(plan: SeatingPlan): Promise<void> {
    this.plans.set(plan.event_id, { ...plan });
  }

  async updateAssignments(eventId: string, assignments: SeatAssignments): Promise<void> {
    const plan = this.plans.get(eventId);
    if (!plan) return;
    this.plans.set(eventId, {
      ...plan,
      assignments,
      updated_at: new Date().toISOString(),
    });
  }

  clear(): void {
    this.plans.clear();
  }
}
