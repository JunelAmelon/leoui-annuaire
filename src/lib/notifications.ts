import { addDocument } from '@/lib/db';

export type NotificationType =
  | 'message'
  | 'document'
  | 'payment'
  | 'planning'
  | 'review'
  | 'devis'
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
