import type { Gazette } from '../domain/types';

export interface IGazetteRepository {
  /**
   * Récupère la gazette par son ID déterministe (event_id).
   */
  getByEventId(eventId: string): Promise<Gazette | null>;

  /**
   * Crée ou sauvegarde intégralement la gazette.
   */
  save(gazette: Gazette): Promise<Gazette>;

  /**
   * Met à jour partiellement la gazette avec vérification optimiste de version.
   * Si expectedVersion est fourni et ne correspond pas, rejette avec une erreur de conflit.
   */
  update(
    eventId: string,
    partial: Partial<Gazette>,
    expectedVersion?: number
  ): Promise<Gazette>;

  /**
   * Supprime la gazette d'un événement.
   */
  delete(eventId: string): Promise<void>;
}
