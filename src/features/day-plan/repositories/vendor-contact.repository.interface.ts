/**
 * Prestataires LeOui du couple (avec qui il échange ou a collaboré) et envoi par la messagerie de la solution.
 * Interfaces petites (ISP) : le service de diffusion dépend de ces contrats, jamais de Firestore.
 */

export interface VendorContact {
  /** Identifiant du prestataire LeOui (`vendors/{id}`). */
  ref_id: string;
  name: string;
  /** Une collaboration est enregistrée avec ce prestataire. */
  collaborated: boolean;
  /** Conversation existante dans la messagerie, sinon `null` (créée à l'envoi). */
  conversation_id: string | null;
}

export interface VendorContactReader {
  list(clientId: string): Promise<VendorContact[]>;
}

export interface MessageSender {
  uid: string;
  name: string;
  client_id: string;
}

export interface VendorMessenger {
  /** Dépose `text` dans la conversation du prestataire (la crée au besoin) et le notifie. */
  send(contact: VendorContact, sender: MessageSender, text: string): Promise<void>;
}
