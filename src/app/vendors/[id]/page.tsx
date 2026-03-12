'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ChatAssistant from '@/components/ChatAssistant';
import VendorProfileDetailView from '@/components/VendorProfileDetailView';
import { getDocument, getDocuments, incrementDocumentFields, updateDocument, addDocument } from '@/lib/db';

export default function VendorProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [similarVendors, setSimilarVendors] = useState<any[]>([]);

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
        if (vendorData?.category) {
          const sim = await getDocuments('vendors', [
            { field: 'category', operator: '==', value: vendorData.category },
          ]);
          setSimilarVendors((sim as any[]).filter(v => v.id !== id).slice(0, 3));
        }
        incrementDocumentFields('vendors', id, { viewCount: 1 }).catch(() => {});
        updateDocument('vendors', id, { lastViewedAt: new Date().toISOString() }).catch(() => {});
      } catch (e) {
        console.error('Failed to load vendor:', e);
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
    await addDocument('conversations', {
      vendor_id: id,
      client_name: form.name,
      client_email: form.email,
      client_phone: form.phone,
      message: form.message,
      created_at: new Date().toISOString(),
      status: 'new',
    });
  };

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />
      <VendorProfileDetailView
        vendorId={id}
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