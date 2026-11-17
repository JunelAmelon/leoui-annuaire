/**
 * Diffusion du planning aux prestataires LeOui : prépare un lien personnel par prestataire,
 * puis l'envoie dans la messagerie de la solution. Dépend de contrats, pas de Firestore (DIP).
 */

import type { DayPlan } from '../domain/types';
import type { MessageSender, VendorContact, VendorMessenger } from '../repositories/vendor-contact.repository.interface';
import type { DayPlanService } from './day-plan.service';

export interface DispatchResult {
  plan: DayPlan;
  sent: string[];
  failed: string[];
}

export const buildShareMessage = (coupleNames: string, url: string): string =>
  `Bonjour, voici votre lien personnel pour le planning du jour J de ${coupleNames} :\n${url}\n\n` +
  'Vous y retrouvez le déroulé complet, vos moments en avant, l’itinéraire de chaque lieu, ' +
  'et vous pouvez nous proposer un autre horaire si besoin. Merci !';

export class DayPlanDispatchService {
  constructor(private readonly plans: DayPlanService, private readonly messenger: VendorMessenger) {}

  async sendLinks(
    plan: DayPlan, contacts: VendorContact[], sender: MessageSender, coupleNames: string, urlFor: (eventId: string, token: string) => string
  ): Promise<DispatchResult> {
    const updated = await this.plans.ensureVendorLinks(plan, contacts.map((c) => ({ ref_id: c.ref_id, label: c.name })));
    const sent: string[] = [];
    const failed: string[] = [];
    for (const contact of contacts) {
      const link = updated.share.vendor_links.find((l) => l.ref_id === contact.ref_id && !l.token_revoked_at);
      if (!link) { failed.push(contact.name); continue; }
      try {
        await this.messenger.send(contact, sender, buildShareMessage(coupleNames, urlFor(updated.event_id, link.token)));
        sent.push(contact.name);
      } catch {
        failed.push(contact.name);
      }
    }
    return { plan: updated, sent, failed };
  }
}
