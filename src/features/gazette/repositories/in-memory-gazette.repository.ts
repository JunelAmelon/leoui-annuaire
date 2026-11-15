import type { Gazette } from '../domain/types';
import type { IGazetteRepository } from './gazette.repository.interface';

export class InMemoryGazetteRepository implements IGazetteRepository {
  private gazettes = new Map<string, Gazette>();

  async getByEventId(eventId: string): Promise<Gazette | null> {
    const gazette = this.gazettes.get(eventId);
    if (!gazette) return null;
    return JSON.parse(JSON.stringify(gazette));
  }

  async save(gazette: Gazette): Promise<Gazette> {
    const clone = JSON.parse(JSON.stringify(gazette)) as Gazette;
    clone.updated_at = new Date().toISOString();
    this.gazettes.set(gazette.event_id, clone);
    return JSON.parse(JSON.stringify(clone));
  }

  async update(
    eventId: string,
    partial: Partial<Gazette>,
    expectedVersion?: number
  ): Promise<Gazette> {
    const existing = this.gazettes.get(eventId);
    if (!existing) {
      throw new Error(`Gazette introuvable pour l’événement ${eventId}`);
    }

    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new Error(
        `Conflit d’édition : version attendue ${expectedVersion}, mais la version actuelle est ${existing.version}.`
      );
    }

    const updated: Gazette = {
      ...existing,
      ...partial,
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
    };

    this.gazettes.set(eventId, updated);
    return JSON.parse(JSON.stringify(updated));
  }

  async delete(eventId: string): Promise<void> {
    this.gazettes.delete(eventId);
  }

  // Méthode utilitaire de test
  clear(): void {
    this.gazettes.clear();
  }
}

