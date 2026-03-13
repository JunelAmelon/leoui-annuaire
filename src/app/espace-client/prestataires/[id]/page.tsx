'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import VendorProfileDetailView from '@/components/VendorProfileDetailView';
import { getDocument, getDocuments, addDocument, incrementDocumentFields, updateDocument, deleteDocument } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { toast } from 'sonner';
import { Image as ImageIcon, UserCheck, UserPlus } from 'lucide-react';

export default function ClientVendorProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();
  const { client } = useClientData();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [resolvedVendorId, setResolvedVendorId] = useState<string>('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [similarVendors, setSimilarVendors] = useState<any[]>([]);
  const [collab, setCollab] = useState<any>(null);
  const [collabLoading, setCollabLoading] = useState(false);
  const [existingClientReview, setExistingClientReview] = useState<{ rating: number; comment: string } | null>(null);

  const coupleName = client
    ? (client.name || '') + (client.name && client.partner ? ' & ' : '') + (client.partner || '')
    : user?.displayName || 'Client';

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        let vendorData = await getDocument('vendors', id);
        if (!vendorData) {
          const [byUid, byLegacyId] = await Promise.all([
            getDocuments('vendors', [{ field: 'uid', operator: '==', value: id }]),
            getDocuments('vendors', [{ field: 'id', operator: '==', value: id }]),
          ]);
          vendorData = (byUid?.[0] as any) || (byLegacyId?.[0] as any) || null;
        }

        if (!vendorData) {
          setVendor(null);
          setResolvedVendorId('');
          return;
        }

        const vendorId = (vendorData as any).id;
        setResolvedVendorId(vendorId);

        const [reviewsData, promoData] = await Promise.all([
          getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: vendorId }]),
          getDocuments('promotions', [
            { field: 'vendor_id', operator: '==', value: vendorId },
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
          setSimilarVendors((sim as any[]).filter(v => v.id !== vendorId).slice(0, 3));
        }
        incrementDocumentFields('vendors', vendorId, { viewCount: 1 }).catch(() => {});
        updateDocument('vendors', vendorId, { lastViewedAt: new Date().toISOString() }).catch(() => {});
        if (client?.id) {
          const [collabs, existingReviews] = await Promise.all([
            getDocuments('collaborations', [
              { field: 'client_id', operator: '==', value: client.id },
              { field: 'vendor_id', operator: '==', value: vendorId },
            ]),
            getDocuments('reviews', [
              { field: 'vendor_id', operator: '==', value: vendorId },
              { field: 'client_id', operator: '==', value: client.id },
            ]),
          ]);
          setCollab(collabs[0] || null);
          const myReview = (existingReviews[0] as any);
          if (myReview) setExistingClientReview({ rating: myReview.rating, comment: myReview.comment || '' });
        }
      } catch {
        setVendor(null);
        setResolvedVendorId('');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, client?.id]);

  const handleToggleCollab = async () => {
    if (!client?.id || !vendor) return;
    const vendorId = resolvedVendorId || vendor?.uid || vendor?.id;
    setCollabLoading(true);
    try {
      if (collab) {
        await deleteDocument('collaborations', collab.id);
        setCollab(null);
        toast.success('Prestataire retiré de votre liste');
      } else {
        const ref = await addDocument('collaborations', {
          client_id: client.id,
          client_name: coupleName,
          client_email: user?.email || '',
          vendor_id: vendorId,
          vendor_name: vendor.name,
          vendor_email: vendor.email || '',
          status: 'active',
          created_at: new Date().toISOString(),
        });
        setCollab({ id: ref.id, client_id: client.id, vendor_id: vendorId });
        toast.success(`${vendor.name} ajouté à vos prestataires`);
      }
    } catch { toast.error('Erreur'); } finally { setCollabLoading(false); }
  };

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
    // Notifier le prestataire
    createNotification({
      recipientId: vendorId,
      type: 'message',
      title: `Nouveau message de ${coupleName}`,
      message: form.message.trim().slice(0, 100),
      link: '/espace-prestataire/messages',
    });
    toast.success('Message envoyé !');
    router.push('/espace-client/messages');
  };

  const handleSubmitReview = async (review: { rating: number; comment: string }) => {
    if (!client?.id || !resolvedVendorId) { toast.error('Données manquantes'); return; }
    await addDocument('reviews', {
      vendor_id: resolvedVendorId,
      client_id: client.id,
      client_name: coupleName,
      rating: review.rating,
      comment: review.comment,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'verified',
    });
    const updatedReviews = [
      { id: Date.now().toString(), vendor_id: resolvedVendorId, client_id: client.id, client_name: coupleName, rating: review.rating, comment: review.comment, date: new Date().toISOString(), status: 'verified' },
      ...reviews,
    ];
    setExistingClientReview({ rating: review.rating, comment: review.comment });
    setReviews(updatedReviews);
    // Recalculer et enregistrer la note du prestataire dans son document
    const newCount = updatedReviews.length;
    const newAvg = Math.round(updatedReviews.reduce((s, r) => s + (r.rating || 5), 0) / newCount * 10) / 10;
    updateDocument('vendors', resolvedVendorId, { rating: newAvg, reviewCount: newCount }).catch(() => {});
    // Notifier le prestataire
    createNotification({
      recipientId: resolvedVendorId,
      type: 'review',
      title: `Nouvel avis de ${coupleName}`,
      message: `${review.rating}/5 — ${review.comment.slice(0, 80)}`,
      link: '/espace-prestataire/avis',
    });
    toast.success('Avis publié !');
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
    <div>
      {/* Collaboration action banner */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={handleToggleCollab}
          disabled={collabLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            collab
              ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
              : 'bg-rose-600 text-white hover:bg-rose-700'
          } disabled:opacity-50`}
        >
          {collab ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {collabLoading ? '…' : collab ? 'Prestataire lié ✓' : 'Ajouter à mes prestataires'}
        </button>
      </div>
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
        contactIntroText="Votre message sera envoyé directement via la messagerie LeOui."
        isLoggedIn={Boolean(user)}
        clientName={coupleName}
        canReview={Boolean(collab) && !existingClientReview}
        existingClientReview={existingClientReview}
        onSubmitReview={handleSubmitReview}
      />
    </div>
  );
}