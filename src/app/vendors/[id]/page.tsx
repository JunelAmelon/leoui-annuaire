'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatAssistant from '@/components/ChatAssistant';
import VendorProfileDetailView from '@/components/VendorProfileDetailView';
import { toast } from 'sonner';

export default function VendorProfilePage() {
  const params = useParams();
  const id = params?.id as string;

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
    <div className="min-h-screen bg-ivory-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-6 animate-pulse">
        <div className="h-[460px] bg-stone-200 rounded-2xl" />
        <div className="h-8 w-48 bg-stone-200 rounded-xl" />
        <div className="h-40 bg-stone-100 rounded-2xl" />
      </div>
    </div>
  );

  if (!vendor) return (
    <div className="min-h-screen bg-ivory-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-32 text-center">
        <p className="font-serif text-2xl text-charcoal-600">Prestataire introuvable</p>
        <Link href="/vendors" className="mt-4 inline-block text-rose-600 hover:underline">Retour</Link>
      </div>
    </div>
  );

  const handleContact = async (form: { name: string; email: string; phone: string; message: string }) => {
    try {
      const res = await fetch('/api/public/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: resolvedVendorId || id,
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
  };

  return (
    <div className="min-h-screen bg-ivory-50">
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
      />
      <Footer />
      <ChatAssistant />
    </div>
  );
}