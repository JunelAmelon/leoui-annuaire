import { getDocument, getDocuments } from './db';

export interface ClientData {
  id: string;
  name: string;
  partner?: string;
  email: string;
  phone?: string;
  photo?: string;
  planner_id: string;
  event_date?: string;
  budget?: number;
  guest_count?: number;
  theme_style?: string;
  theme_colors?: string[];
  moodboard_images?: string[];
  created_at?: string;
}

export interface EventData {
  id: string;
  client_id: string;
  couple_names: string;
  event_date: string;
  venue?: string;
  budget?: number;
  guest_count?: number;
  theme_style?: string;
  theme_colors?: string[];
  moodboard_images?: string[];
  progress?: number;
  ceremony_time?: string;
  reception_venue?: string;
  notes?: string;
}

export interface DevisData {
  id: string;
  reference: string;
  client_id?: string;
  client_email?: string;
  status: string;
  date?: string;
  sent_at?: string;
  pdf_url?: string;
  amount?: number;
  accepted_at?: string;
  rejected_at?: string;
  invoice_id?: string;
  docusign?: {
    envelope_id?: string;
    status?: string;
    recipients?: {
      client?: { status?: string };
      planner?: { status?: string };
    };
  };
}

export interface DocumentData {
  id: string;
  name: string;
  type: string;
  file_url?: string;
  file_type?: string;
  file_size?: number;
  uploaded_at?: string;
  uploaded_by?: string;
  client_id?: string;
  planner_id?: string;
  event_id?: string;
  status?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  deadline?: string;
  completed: boolean;
  category: string;
  priority: 'high' | 'medium' | 'low';
  eventId: string;
  completedAt?: string;
}

export interface ConversationData {
  id: string;
  client_id: string;
  planner_id: string;
  last_message?: string;
  last_message_at?: string;
  unread_count_client?: number;
  unread_count_planner?: number;
}

export interface MessageData {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'client' | 'planner';
  sender_name?: string;
  content: string;
  attachments?: Array<{ url: string; name?: string; type?: string }>;
  created_at?: string;
}

export interface PaymentData {
  id: string;
  client_id: string;
  description: string;
  vendor?: string;
  amount: number;
  amount_due?: number;
  status: string;
  date?: string;
  due_date?: string;
  invoice?: boolean;
  invoice_id?: string;
  created_at?: any;
  pdf_url?: string;
}

export interface VendorData {
  id: string;
  name: string;
  category: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  rating?: number;
  photo?: string;
  status?: string;
  next_appointment?: string;
}

export interface GalleryData {
  id: string;
  event_id: string;
  client_id?: string;
  url: string;
  album?: string;
  caption?: string;
  uploaded_at?: string;
}

export async function getClientFullData(userId: string): Promise<ClientData | null> {
  try {
    const clients = await getDocuments('clients', [
      { field: 'uid', operator: '==', value: userId },
    ]);
    if (clients.length > 0) {
      return clients[0] as ClientData;
    }

    const profileDoc = await getDocument('profiles', userId);
    if (profileDoc) {
      return profileDoc as ClientData;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getClientFullDataWithEmail(email: string): Promise<ClientData | null> {
  try {
    const clients = await getDocuments('clients', [
      { field: 'email', operator: '==', value: email },
    ]);
    if (clients.length > 0) return clients[0] as ClientData;
    return null;
  } catch {
    return null;
  }
}

export async function getClientEvent(clientId: string): Promise<EventData | null> {
  try {
    const events = await getDocuments('events', [
      { field: 'client_id', operator: '==', value: clientId },
    ]);
    if (events.length > 0) return events[0] as EventData;
    return null;
  } catch {
    return null;
  }
}

export async function getClientDocuments(clientId: string): Promise<DocumentData[]> {
  try {
    const docs = await getDocuments('documents', [
      { field: 'client_id', operator: '==', value: clientId },
    ]);
    return docs as DocumentData[];
  } catch {
    return [];
  }
}

export async function getClientDevis(clientId: string, clientEmail?: string): Promise<DevisData[]> {
  try {
    const byId = await getDocuments('devis', [
      { field: 'client_id', operator: '==', value: clientId },
    ]);
    if (byId.length > 0) return byId as DevisData[];

    if (clientEmail) {
      const byEmail = await getDocuments('devis', [
        { field: 'client_email', operator: '==', value: clientEmail },
      ]);
      return byEmail as DevisData[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function getClientPayments(clientId: string): Promise<PaymentData[]> {
  try {
    const payments = await getDocuments('invoices', [
      { field: 'client_id', operator: '==', value: clientId },
    ]);
    return payments.map((p: any) => ({
      ...p,
      amount: Number(p.amount || p.total || 0),
      amount_due: Number(p.amount_due ?? 0),
      status: p.status || 'pending',
      description: p.description || p.title || 'Paiement',
      vendor: p.vendor || '',
      invoice: Boolean(p.pdf_url),
    })) as PaymentData[];
  } catch {
    return [];
  }
}

export async function getClientBudgetSummary(clientId: string): Promise<{
  total: number;
  paid: number;
  pending: number;
  remaining: number;
}> {
  const payments = await getClientPayments(clientId);
  const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const paid = payments
    .filter((p) => p.status === 'paid' || p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pending = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue' || p.status === 'partial')
    .reduce((sum, p) => sum + Number(p.amount_due ?? p.amount ?? 0), 0);
  return { total, paid, pending, remaining: total - paid };
}

export async function getClientVendors(clientId: string, eventId?: string): Promise<VendorData[]> {
  try {
    const filters: any[] = eventId
      ? [{ field: 'event_id', operator: '==', value: eventId }]
      : [{ field: 'client_id', operator: '==', value: clientId }];

    const assignments = await getDocuments('client_vendors', filters);
    const vendorIds = assignments.map((a: any) => a.vendor_id).filter(Boolean);

    const vendors = await Promise.all(
      vendorIds.map((id: string) => getDocument('vendors', id))
    );

    return vendors
      .filter(Boolean)
      .map((v: any, i: number) => ({
        ...v,
        status: (assignments[i] as any)?.status || 'confirmed',
        next_appointment: (assignments[i] as any)?.next_appointment || null,
      })) as VendorData[];
  } catch {
    return [];
  }
}

export async function getClientGallery(eventId: string): Promise<GalleryData[]> {
  try {
    const items = await getDocuments('galleries', [
      { field: 'event_id', operator: '==', value: eventId },
    ]);
    return items as GalleryData[];
  } catch {
    return [];
  }
}

export function calculateDaysRemaining(eventDate: string): number {
  if (!eventDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(eventDate);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
