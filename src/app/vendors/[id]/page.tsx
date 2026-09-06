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
        isLoggedIn={!!user}
        clientName={user?.displayName || user?.email || ''}
      />
      <Footer />
    </div>
  );
}