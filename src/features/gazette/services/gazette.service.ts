import type {
  Gazette,
  GazetteSection,
  GazetteSectionType,
  ProgramItem,
  SectionContent,
  UpdateGazetteInput,
} from '../domain/types';
import { createDefaultGazette } from '../domain/gazette-defaults';
import type { IGazetteRepository } from '../repositories/gazette.repository.interface';

export const MAX_GAZETTE_SECTIONS = 30;

export class GazetteService {
  constructor(private readonly repository: IGazetteRepository) {}

  /**
   * Récupère la gazette existante ou l'initialise avec les sections types.
   */
  async getOrCreateGazette(
    eventId: string,
    ownerId: string,
    options?: {
      title?: string;
      weddingDate?: string;
      locationName?: string;
    }
  ): Promise<Gazette> {
    if (!eventId || !ownerId) {
      throw new Error('eventId et ownerId sont requis pour initialiser la gazette.');
    }

    const existing = await this.repository.getByEventId(eventId);
    if (existing) {
      return existing;
    }

    const defaultGazette = createDefaultGazette(
      eventId,
      ownerId,
      options?.title || 'La Gazette des Mariés',
      options?.weddingDate || '',
      options?.locationName || ''
    );

    return this.repository.save(defaultGazette);
  }

  /**
   * Met à jour les métadonnées globales de la gazette (titre, dates, thème, une).
   */
  async updateMetadata(
    eventId: string,
    input: UpdateGazetteInput
  ): Promise<Gazette> {
    const existing = await this.getExistingGazette(eventId);

    const updatePayload: Partial<Gazette> = {};
    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.subtitle !== undefined) updatePayload.subtitle = input.subtitle.trim();
    if (input.wedding_date !== undefined) updatePayload.wedding_date = input.wedding_date;
    if (input.location_name !== undefined) updatePayload.location_name = input.location_name.trim();
    if (input.cover_path !== undefined) updatePayload.cover_path = input.cover_path;
    if (input.cover_caption !== undefined) updatePayload.cover_caption = input.cover_caption.trim();
    if (input.editorial !== undefined) updatePayload.editorial = input.editorial.trim();
    if (input.weather_forecast !== undefined) updatePayload.weather_forecast = input.weather_forecast.trim();

    if (input.layout) {
      updatePayload.layout = {
        ...existing.layout,
        ...input.layout,
      };
    }

    return this.repository.update(eventId, updatePayload, input.expected_version);
  }

  /**
   * Ajoute une nouvelle rubrique (max 30 sections).
   */
  async addSection(
    eventId: string,
    section: {
      type: GazetteSectionType;
      title: string;
      content: SectionContent;
    },
    expectedVersion: number
  ): Promise<Gazette> {
    const existing = await this.getExistingGazette(eventId);

    if (existing.sections.length >= MAX_GAZETTE_SECTIONS) {
      throw new Error(
        `Limite atteinte : une gazette ne peut contenir plus de ${MAX_GAZETTE_SECTIONS} sections.`
      );
    }

    const newSection: GazetteSection = {
      id: `section_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: section.type,
      title: section.title.trim() || 'Nouvelle rubrique',
      content: section.content,
      order: existing.sections.length + 1,
    };

    const nextSections = [...existing.sections, newSection];
    return this.repository.update(
      eventId,
      { sections: nextSections },
      expectedVersion
    );
  }

  /**
   * Met à jour le contenu ou le titre d'une rubrique précise.
   */
  async updateSection(
    eventId: string,
    sectionId: string,
    partialSection: {
      title?: string;
      content?: SectionContent;
    },
    expectedVersion: number
  ): Promise<Gazette> {
    const existing = await this.getExistingGazette(eventId);
    const index = existing.sections.findIndex((s) => s.id === sectionId);

    if (index === -1) {
      throw new Error(`Section « ${sectionId} » introuvable dans la gazette.`);
    }

    const updatedSection: GazetteSection = {
      ...existing.sections[index],
      ...(partialSection.title !== undefined
        ? { title: partialSection.title.trim() }
        : {}),
      ...(partialSection.content !== undefined
        ? { content: partialSection.content }
        : {}),
    };

    const nextSections = [...existing.sections];
    nextSections[index] = updatedSection;

    // Si on modifie manuellement une section de type 'program', basculer program_source à 'custom'
    const updatePayload: Partial<Gazette> = { sections: nextSections };
    if (updatedSection.type === 'program') {
      updatePayload.program_source = 'custom';
    }

    return this.repository.update(eventId, updatePayload, expectedVersion);
  }

  /**
   * Supprime une rubrique et réindexe l'ordre.
   */
  async removeSection(
    eventId: string,
    sectionId: string,
    expectedVersion: number
  ): Promise<Gazette> {
    const existing = await this.getExistingGazette(eventId);
    const filtered = existing.sections.filter((s) => s.id !== sectionId);

    if (filtered.length === existing.sections.length) {
      throw new Error(`Section « ${sectionId} » introuvable.`);
    }

    // Réindexer l'ordre de 1 à N
    const reindexed: GazetteSection[] = filtered.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));

    return this.repository.update(
      eventId,
      { sections: reindexed },
      expectedVersion
    );
  }

  /**
   * Réordonne l'ensemble des rubriques.
   */
  async reorderSections(
    eventId: string,
    orderedSectionIds: string[],
    expectedVersion: number
  ): Promise<Gazette> {
    const existing = await this.getExistingGazette(eventId);
    const map = new Map(existing.sections.map((s) => [s.id, s]));

    const reordered: GazetteSection[] = [];
    orderedSectionIds.forEach((id, index) => {
      const section = map.get(id);
      if (section) {
        reordered.push({ ...section, order: index + 1 });
        map.delete(id);
      }
    });

    // Ajouter les sections omises en fin de liste au cas où
    map.forEach((s) => {
      reordered.push({ ...s, order: reordered.length + 1 });
    });

    return this.repository.update(
      eventId,
      { sections: reordered },
      expectedVersion
    );
  }

  /**
   * Synchronise le programme du jour J avec les moments du planning (day_plans).
   */
  async syncProgramFromDayPlan(
    eventId: string,
    dayPlanItems: ProgramItem[],
    expectedVersion: number
  ): Promise<Gazette> {
    const existing = await this.getExistingGazette(eventId);
    const now = new Date().toISOString();

    const programIndex = existing.sections.findIndex((s) => s.type === 'program');
    let nextSections = [...existing.sections];

    if (programIndex !== -1) {
      nextSections[programIndex] = {
        ...nextSections[programIndex],
        content: { items: dayPlanItems },
      };
    } else {
      const newProgramSection: GazetteSection = {
        id: `section_program_${Date.now()}`,
        type: 'program',
        title: 'Le Déroulé du Jour J',
        order: nextSections.length + 1,
        content: { items: dayPlanItems },
      };
      nextSections.push(newProgramSection);
    }

    return this.repository.update(
      eventId,
      {
        sections: nextSections,
        program_source: 'plan',
        program_synced_at: now,
      },
      expectedVersion
    );
  }

  private async getExistingGazette(eventId: string): Promise<Gazette> {
    const existing = await this.repository.getByEventId(eventId);
    if (!existing) {
      throw new Error(`Gazette introuvable pour l'événement ${eventId}.`);
    }
    return existing;
  }
}

