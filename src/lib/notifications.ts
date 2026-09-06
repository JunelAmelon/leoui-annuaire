import { addDocument, getDocument } from '@/lib/db';

export type NotificationType =
  | 'message'
  | 'document'
  | 'payment'
  | 'planning'
  | 'review'
  | 'contrat';

export async function createNotification(params: {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}): Promise<void> {
  try {
    await addDocument('notifications', {
      recipient_id: params.recipientId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link || null,
      read: false,
      created_at: new Date(),
    });
  } catch {
    // Non-bloquant
  }
}

/**
 * Résout un identifiant client (doc `clients` ou `profiles`) vers l'UID Firebase Auth
 * utilisé comme `recipient_id` dans les notifications.
 */
export async function resolveClientRecipientId(clientId: string): Promise<string> {
  try {
    const clientDoc = await getDocument('clients', clientId);
    if (clientDoc?.uid) return clientDoc.uid;
  } catch {}
  try {
    const profileDoc = await getDocument('profiles', clientId);
    if (profileDoc) return clientId;
  } catch {}
  return clientId;
}
