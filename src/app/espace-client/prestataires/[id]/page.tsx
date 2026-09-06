'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import VendorProfileDetailView from '@/components/VendorProfileDetailView';
import { getDocument, getDocuments, addDocument, incrementDocumentFields, updateDocument, deleteDocument } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { renderContactEmail, renderNewReviewEmail } from '@/lib/email-template';
import { toast } from 'sonner';
import { Image as ImageIcon, UserCheck, UserPlus } from 'lucide-react';

export default function ClientVendorProfilePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const { user } = useAuth();
  const { client, event, refresh } = useClientData();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [resolvedVendorId, setResolvedVendorId] = useState<string>('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [similarVendors, setSimilarVendors] = useState<any[]>([]);
  const [collab, setCollab] = useState<any>(null);
  const [collabLoading, setCollabLoading] = useState(false);
  const [existingClientReview, setExistingClientReview] = useState<{ rating: number; comment: string } | null>(null);
  const [venueLoading, setVenueLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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
        const resolveImage = (d: any) =>
          (Array.isArray(d?.images) && d.images[0]) || d?.imageUrl || d?.photo || '';

        setVendor({ ...(vendorData as any), imageUrl: resolveImage(vendorData) });
        setReviews(reviewsData as any[]);
        setPromotions(promoData as any[]);
        if ((vendorData as any)?.category) {
          const sim = await getDocuments('vendors', [
            { field: 'category', operator: '==', value: (vendorData as any).category },
          ]);
          setSimilarVendors(
            (sim as any[])
              .filter(v => v.id !== vendorId)
              .slice(0, 3)
              .map(v => ({ ...v, imageUrl: resolveImage(v) }))
          );
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

  // Charger les favoris du client
  useEffect(() => {
    const fromClient = client?.favorite_vendor_ids;
    if (fromClient && fromClient.length > 0) {
      setFavorites(new Set(fromClient));
      return;
    }
    const stored = typeof window !== 'undefined' ? localStorage.getItem('favorite_vendor_ids') : null;
    if (stored) {
      try { setFavorites(new Set(JSON.parse(stored))); } catch {}
    }
  }, [client?.favorite_vendor_ids]);

  const handleToggleFavorite = async () => {
    if (!client?.id || !resolvedVendorId) return;
    const next = new Set(favorites);
    if (next.has(resolvedVendorId)) next.delete(resolvedVendorId); else next.add(resolvedVendorId);
    setFavorites(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('favorite_vendor_ids', JSON.stringify(Array.from(next)));
    }
    try {
      await updateDocument('clients', client.id, { favorite_vendor_ids: Array.from(next) } as any);
      await refresh();
      toast.success(next.has(resolvedVendorId) ? 'Ajouté aux favoris' : 'Retiré des favoris');
    } catch {
      toast.error('Erreur lors de l\'enregistrement du favori');
    }
  };

  const isVenueVendor = String(vendor?.category || '') === 'Lieux de réception';
  const currentVenueVendorId = String((event as any)?.venue_vendor_id || (client as any)?.venue_vendor_id || '');
  const isCurrentVenue = Boolean(isVenueVendor && resolvedVendorId && currentVenueVendorId && resolvedVendorId === currentVenueVendorId);

  const handleSetVenue = async () => {
    if (!user?.uid) { router.push('/login'); return; }
    if (!resolvedVendorId) { toast.error('Prestataire introuvable'); return; }
    setVenueLoading(true);
    try {
      const token = await (await import('@/lib/firebase')).auth.currentUser?.getIdToken();
      if (!token) throw new Error('Unauthorized');

      const res = await fetch('/api/client/venue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ vendorId: resolvedVendorId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Erreur');
      await refresh();
      toast.success(isCurrentVenue ? 'Lieu déjà sélectionné' : 'Lieu de réception enregistré');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la sélection du lieu');
    } finally {
      setVenueLoading(false);
    }
  };

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
    const vendorId = vendor?.uid || vendor?.id;
    const clientId = client?.id || user.uid;
    let coupleName = '';
    if (client?.name) {
      coupleName = `${client.name}${client.partner ? ' & ' + client.partner : ''}`.trim();
    }
    if (!coupleName && user?.uid) {
      try {
        const profile = (await getDocument('profiles', user.uid)) as any;
        if (profile?.name) {
          coupleName = `${profile.name}${profile.partner ? ' & ' + profile.partner : ''}`.trim();
        }
      } catch {}
    }
    if (!coupleName) {
      coupleName = user.displayName || user.email || 'Client';
    }

    const existingConvs = await getDocuments('conversations', [
      { field: 'client_id', operator: '==', value: clientId },
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
        client_id: clientId,
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
    if (vendor?.email) {
      sendEmail({
        to: vendor.email,
        subject: `Nouveau message de ${coupleName}`,
        html: renderContactEmail({ vendorName: vendor.name || 'Prestataire', clientName: coupleName, message: form.message.trim(), replyEmail: user?.email || undefined }),
      });
    }
    toast.success('Message envoyé !');
  };

  const handleSubmitReview = async (review: { rating: number; comment: string }) => {
    if (!client?.id || !resolvedVendorId) { toast.error('Données manquantes'); return; }
    const now = new Date().toISOString();
    const existing = await getDocuments('reviews', [
      { field: 'vendor_id', operator: '==', value: resolvedVendorId },
      { field: 'client_id', operator: '==', value: client.id },
    ]);
    if ((existing as any[]).length > 0) {
      setExistingClientReview({ rating: (existing[0] as any).rating, comment: (existing[0] as any).comment });
      toast.error('Vous avez déjà laissé un avis pour ce prestataire');
      return;
    }
    await addDocument('reviews', {
      vendor_id: resolvedVendorId,
      client_id: client.id,
      client_name: coupleName,
      client_photo: client.photo || '',
      rating: review.rating,
      comment: review.comment,
      date: now,
      created_at: now,
      updated_at: now,
      status: 'published',
      source: 'client_space',
      vendor_reply: '',
    });
    const updatedReviews = [
      { id: Date.now().toString(), vendor_id: resolvedVendorId, client_id: client.id, client_name: coupleName, rating: review.rating, comment: review.comment, date: now, created_at: now, updated_at: now, status: 'published', source: 'client_space', vendor_reply: '' },
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
    if (vendor?.email) {
      sendEmail({
        to: vendor.email,
        subject: `Nouvel avis de ${coupleName} (${review.rating}/5)`,
        html: renderNewReviewEmail({ vendorName: vendor.name || 'Prestataire', clientName: coupleName, rating: review.rating, comment: review.comment }),
      });
    }
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
      <div className="flex items-center justify-end gap-2 flex-wrap mb-4">
        {isVenueVendor && (
          <button
            onClick={() => void handleSetVenue()}
            disabled={venueLoading || isCurrentVenue}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              isCurrentVenue
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-charcoal-700 border-charcoal-200 hover:bg-stone-50'
            } disabled:opacity-60`}
          >
            {venueLoading ? '…' : isCurrentVenue ? 'Lieu sélectionné' : 'Choisir comme lieu'}
          </button>
        )}
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
          {collabLoading ? '…' : collab ? 'Prestataire lié' : 'Ajouter à mes prestataires'}
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
        isFavorite={favorites.has(resolvedVendorId || (vendor as any)?.uid || (vendor as any)?.id || '')}
        onFavoriteToggle={handleToggleFavorite}
      />
    </div>
  );
}