'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import VendorProfileDetailView from '@/components/VendorProfileDetailView';
import { getDocument, getDocuments, addDocument, incrementDocumentFields, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import { Image as ImageIcon } from 'lucide-react';

export default function ClientVendorProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();
  const { client } = useClientData();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [similarVendors, setSimilarVendors] = useState<any[]>([]);

  const coupleName = client
    ? (client.name || '') + (client.name && client.partner ? ' & ' : '') + (client.partner || '')
    : user?.displayName || 'Client';

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [vendorData, reviewsData, promoData] = await Promise.all([
          getDocument('vendors', id),
          getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: id }]),
          getDocuments('promotions', [
            { field: 'vendor_id', operator: '==', value: id },
            { field: 'status', operator: '==', value: 'active' },
          ]),
        ]);
        setVendor(vendorData);
        setReviews(reviewsData as any[]);
        setPromotions(promoData as any[]);
        if ((vendorData as any)?.category) {
          const sim = await getDocuments('vendors', [
            { field: 'category', operator: '==', value: (vendorData as any).category },
          ]);
          setSimilarVendors((sim as any[]).filter(v => v.id !== id).slice(0, 3));
        }
        incrementDocumentFields('vendors', id, { viewCount: 1 }).catch(() => {});
        updateDocument('vendors', id, { lastViewedAt: new Date().toISOString() }).catch(() => {});
      } catch {
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleContact = async (form: { name: string; email: string; phone: string; message: string }) => {
    if (!user) { router.push('/login'); return; }
    if (!client?.id) { toast.error('Profil client introuvable.'); return; }
    const vendorId = vendor?.uid || vendor?.id;
    const existingConvs = await getDocuments('conversations', [
      { field: 'client_id', operator: '==', value: client.id },
    ]);
    const existing = (existingConvs as any[]).find(c => c.vendor_id === vendorId);
    let convId: string;
    if (existing) {
      convId = existing.id;
      await updateDocument('conversations', convId, {
        last_message: form.message.trim(),
        last_message_at: new Date().toISOString(),
        unread_count_vendor: (existing.unread_count_vendor || 0) + 1,
      });
    } else {
      const ref = await addDocument('conversations', {
        client_id: client.id,
        vendor_id: vendorId,
        client_name: coupleName,
        vendor_name: vendor.name,
        vendor_email: vendor.email || '',
        type: 'vendor',
        last_message: form.message.trim(),
        last_message_at: new Date().toISOString(),
        unread_count_vendor: 1,
        unread_count_client: 0,
        created_at: new Date().toISOString(),
      });
      convId = ref.id;
    }
    await addDocument('messages', {
      conversation_id: convId,
      sender_id: user.uid,
      sender_role: 'client',
      sender_name: coupleName,
      content: form.message.trim(),
      created_at: new Date().toISOString(),
    });
    toast.success('Message envoye !');
    router.push('/espace-client/messages');
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-[460px] bg-stone-200 rounded-2xl" />
      <div className="h-8 w-48 bg-stone-200 rounded-xl" />
      <div className="h-40 bg-stone-100 rounded-2xl" />
    </div>
  );

  if (!vendor) return (
    <div className="text-center py-20">
      <ImageIcon className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
      <p className="font-serif text-xl text-charcoal-600">Prestataire introuvable</p>
      <button onClick={() => router.back()} className="mt-4 text-sm text-rose-600 hover:underline">Retour</button>
    </div>
  );

  return (
    <VendorProfileDetailView
      vendorId={id}
      vendor={vendor}
      reviews={reviews}
      promotions={promotions}
      similarVendors={similarVendors}
      homeHref="/espace-client"
      vendorsIndexHref="/espace-client/prestataires"
      similarHrefBase="/espace-client/prestataires"
      onSubmitContact={handleContact}
      contactSubmitDisabled={(form) => !form.message.trim()}
      contactIntroText="Votre message sera envoye directement via la messagerie LeOui."
    />
  );
}