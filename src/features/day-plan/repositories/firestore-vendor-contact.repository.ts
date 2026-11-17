import { addDocument, getDocument, getDocuments, updateDocument } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import type { MessageSender, VendorContact, VendorContactReader, VendorMessenger } from './vendor-contact.repository.interface';

const NAME_FALLBACK = 'Prestataire';

export class FirestoreVendorContactRepository implements VendorContactReader, VendorMessenger {
  async list(clientId: string): Promise<VendorContact[]> {
    const [conversations, collaborations] = await Promise.all([
      getDocuments('conversations', [{ field: 'client_id', operator: '==', value: clientId }]),
      getDocuments('collaborations', [{ field: 'client_id', operator: '==', value: clientId }]),
    ]);

    const byVendor = new Map<string, VendorContact>();
    for (const c of conversations as any[]) {
      if (c.type !== 'vendor' || !c.vendor_id) continue;
      byVendor.set(c.vendor_id, { ref_id: c.vendor_id, name: c.vendor_name || NAME_FALLBACK, collaborated: false, conversation_id: c.id });
    }
    for (const c of collaborations as any[]) {
      if (!c.vendor_id) continue;
      const known = byVendor.get(c.vendor_id);
      if (known) known.collaborated = true;
      else byVendor.set(c.vendor_id, { ref_id: c.vendor_id, name: c.vendor_name || '', collaborated: true, conversation_id: null });
    }

    // Les collaborations sans conversation n'embarquent pas toujours le nom : on le complète.
    await Promise.all([...byVendor.values()].filter((v) => !v.name).map(async (v) => {
      const doc = await getDocument('vendors', v.ref_id).catch(() => null);
      v.name = (doc as any)?.name || NAME_FALLBACK;
    }));

    return [...byVendor.values()].sort((a, b) => Number(b.collaborated) - Number(a.collaborated) || a.name.localeCompare(b.name, 'fr'));
  }

  async send(contact: VendorContact, sender: MessageSender, text: string): Promise<void> {
    const now = new Date().toISOString();
    let conversationId = contact.conversation_id;
    if (conversationId) {
      const conv: any = await getDocument('conversations', conversationId);
      await updateDocument('conversations', conversationId, {
        last_message: text, last_message_at: now, unread_count_vendor: (conv?.unread_count_vendor || 0) + 1,
      });
    } else {
      conversationId = (await addDocument('conversations', {
        client_id: sender.client_id, vendor_id: contact.ref_id, client_name: sender.name, vendor_name: contact.name,
        type: 'vendor', last_message: text, last_message_at: now, unread_count_vendor: 1, unread_count_client: 0, created_at: now,
      })).id;
    }
    await addDocument('messages', {
      conversation_id: conversationId, sender_id: sender.uid, sender_role: 'client', sender_name: sender.name, content: text, created_at: now,
    });
    createNotification({
      recipientId: contact.ref_id, type: 'message', title: `Nouveau message de ${sender.name}`,
      message: text.slice(0, 100), link: '/espace-prestataire/messages',
    });
  }
}
