'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VendorProfileDetailView from '@/components/VendorProfileDetailView';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, getDocuments, addDocument, updateDocument } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { renderContactEmail } from '@/lib/email-template';
import { getClientFullData, getClientEvent } from '@/lib/client-helpers';
import { toast } from 'sonner';

export default function VendorProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [resolvedVendorId, setResolvedVendorId] = useState<string>('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [similarVendors, setSimilarVendors] = useState<any[]>([]);
  const [weddingDate, setWeddingDate] = useState<string | undefined>();
  const [isReserved, setIsReserved] = useState(false);
  const [hasReservedInCategory, setHasReservedInCategory] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/vendors/${encodeURIComponent(id)}`);
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed');

        const vendorData = json?.vendor || null;
        setVendor(vendorData);
        setResolvedVendorId(vendorData?.id || '');
        setReviews(Array.isArray(json?.reviews) ? json.reviews : []);
        setPromotions(Array.isArray(json?.promotions) ? json.promotions : []);
        setSimilarVendors(Array.isArray(json?.similarVendors) ? json.similarVendors : []);
      } catch (e) {
        console.error('Failed to load vendor:', e);
        setResolvedVendorId('');
        setVendor(null);
        setReviews([]);
        setPromotions([]);
        setSimilarVendors([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!user?.uid) return;
    const loadClient = async () => {
      try {
        const clientData = await getClientFullData(user.uid);
        if (clientData?.id) {
          const event = await getClientEvent(clientData.id);
          setWeddingDate(event?.event_date);
          const collabs = await getDocuments('collaborations', [
            { field: 'client_id', operator: '==', value: clientData.id },
          ]);
          const reservedIds = (collabs as any[]).map(c => c.vendor_id).filter(Boolean);
          setIsReserved(reservedIds.includes(resolvedVendorId));
          if (reservedIds.length > 0 && vendor?.category) {
            const allVendors = await getDocuments('vendors', []);
            const reservedCategories = new Set(
              (allVendors as any[])
                .filter(v => reservedIds.includes(v.id) || reservedIds.includes(v.uid))
                .map(v => v.category)
            );
            setHasReservedInCategory(reservedCategories.has(vendor.category));
          } else {
            setHasReservedInCategory(false);
          }
        }
      } catch {}
    };
    loadClient();
  }, [user?.uid, resolvedVendorId, vendor?.category]);

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-6 animate-pulse">
        <div className="h-[460px] bg-stone-200 rounded-2xl" />
        <div className="h-8 w-48 bg-stone-200 rounded-xl" />
        <div className="h-40 bg-stone-100 rounded-2xl" />
      </div>
    </div>
  );

  if (!vendor) return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-32 text-center">
        <p className="font-serif text-2xl text-charcoal-600">Prestataire introuvable</p>
        <Link href="/vendors" className="mt-4 inline-block text-rose-600 hover:underline">Retour</Link>
      </div>
    </div>
  );

  const handleContact = async (form: { name: string; email: string; phone: string; message: string }) => {
    const vendorId = resolvedVendorId || id;
    if (!user) {
      // Anonymous fallback: use public API endpoint
      try {
        const res = await fetch('/api/public/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor_id: vendorId,
            client_name: form.name,
            client_email: form.email,
            client_phone: form.phone,
            message: form.message,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        toast.success('Message envoyé');
      } catch {
        toast.error('Impossible d\'envoyer le message');
      }
      return;
    }

    // Authenticated: create a real conversation linked to the client account
    try {
      // Prefer profile name+partner over Firebase displayName/email
      let coupleName = user.displayName || user.email || 'Client';
      let clientId = user.uid;
      try {
        const profile = (await getDocument('profiles', user.uid)) as any;
        if (profile) {
          coupleName = `${profile.name || ''}${profile.name && profile.partner ? ' & ' + profile.partner : ''}`.trim() || coupleName;
          clientId = profile.id || user.uid;
        }
      } catch {}

      const existingConvs = await getDocuments('conversations', [
        { field: 'client_id', operator: '==', value: clientId },
      ]);
      const existing = (existingConvs as any[]).find((c: any) => c.vendor_id === vendorId);
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
      createNotification({
        recipientId: vendorId,
        type: 'message',
        title: `Nouveau message de ${coupleName}`,
        message: form.message.trim().slice(0, 100),
        link: '/espace-prestataire/messages',
      });
      if (vendor.email) {
        sendEmail({
          to: vendor.email,
          subject: `Nouveau message de ${coupleName}`,
          html: renderContactEmail({ vendorName: vendor.name || 'Prestataire', clientName: coupleName, message: form.message.trim(), replyEmail: user.email || undefined }),
        });
      }
      toast.success('Message envoyé');
    } catch {
      toast.error('Impossible d\'envoyer le message');
    }
  };

  const sendMessageTo = async (targetVendor: any, message: string) => {
    if (!user) throw new Error('Not authenticated');
    const vendorId = targetVendor?.uid || targetVendor?.id;
    let coupleName = user.displayName || user.email || 'Client';
    let clientId = user.uid;
    try {
      const profile = (await getDocument('profiles', user.uid)) as any;
      if (profile) {
        coupleName = `${profile.name || ''}${profile.name && profile.partner ? ' & ' + profile.partner : ''}`.trim() || coupleName;
        clientId = profile.id || user.uid;
      }
    } catch {}

    const existingConvs = await getDocuments('conversations', [
      { field: 'client_id', operator: '==', value: clientId },
    ]);
    const existing = (existingConvs as any[]).find((c: any) => c.vendor_id === vendorId);
    let convId: string;
    if (existing) {
      convId = existing.id;
      await updateDocument('conversations', convId, {
        last_message: message.trim(),
        last_message_at: new Date().toISOString(),
        unread_count_vendor: (existing.unread_count_vendor || 0) + 1,
      });
    } else {
      const ref = await addDocument('conversations', {
        client_id: clientId,
        vendor_id: vendorId,
        client_name: coupleName,
        vendor_name: targetVendor.name,
        vendor_email: targetVendor.email || '',
        type: 'vendor',
        last_message: message.trim(),
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
      content: message.trim(),
      created_at: new Date().toISOString(),
    });
    createNotification({
      recipientId: vendorId,
      type: 'message',
      title: `Nouveau message de ${coupleName}`,
      message: message.trim().slice(0, 100),
      link: '/espace-prestataire/messages',
    });
    if (targetVendor?.email) {
      sendEmail({
        to: targetVendor.email,
        subject: `Nouveau message de ${coupleName}`,
        html: renderContactEmail({ vendorName: targetVendor.name || 'Prestataire', clientName: coupleName, message: message.trim(), replyEmail: user.email || undefined }),
      });
    }
  };

  const handleContactSimilar = async (vendors: any[], message: string) => {
    if (!user) { toast.error('Connectez-vous pour contacter les prestataires'); return; }
    await Promise.all(vendors.map(v => sendMessageTo(v, message)));
    toast.success('Messages envoyés aux prestataires similaires');
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <VendorProfileDetailView
        vendorId={resolvedVendorId || id}
        vendor={vendor}
        reviews={reviews}
        promotions={promotions}
        similarVendors={similarVendors}
        homeHref="/"
        vendorsIndexHref="/vendors"
        similarHrefBase="/vendors"
        onSubmitContact={handleContact}
        onContactSimilar={handleContactSimilar}
        isLoggedIn={!!user}
        clientName={user?.displayName || user?.email || ''}
        isReserved={isReserved}
        hasReservedInCategory={hasReservedInCategory}
        weddingDate={weddingDate}
      />
      <Footer />
    </div>
  );
}